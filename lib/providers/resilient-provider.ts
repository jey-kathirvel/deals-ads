import type {
  DealProvider,
  DiscoveryContext,
  DiscoveryResult,
  ProviderMetadata,
} from "./provider";

export interface ProviderRetryPolicy {
  maximumAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
}

export interface ProviderReliabilityStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  totalAttempts: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenedAt: Date | null;
}

export interface ResilientProviderDependencies {
  now?: () => Date;
  sleep?: (
    milliseconds: number,
  ) => Promise<void>;
}

const DEFAULT_MAXIMUM_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_CIRCUIT_BREAKER_RESET_MS = 60_000;

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
  field: string,
): number {
  const resolved =
    value ?? fallback;

  if (
    !Number.isInteger(
      resolved,
    ) ||
    resolved < 1
  ) {
    throw new Error(
      `${field} must be a positive integer`,
    );
  }

  return resolved;
}

function normalizeNonNegativeInteger(
  value: number | undefined,
  fallback: number,
  field: string,
): number {
  const resolved =
    value ?? fallback;

  if (
    !Number.isInteger(
      resolved,
    ) ||
    resolved < 0
  ) {
    throw new Error(
      `${field} must be a non-negative integer`,
    );
  }

  return resolved;
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function cloneMetadata(
  metadata: ProviderMetadata,
): ProviderMetadata {
  return {
    ...metadata,
  };
}

function normalizeError(
  error: unknown,
): Error {
  if (
    error instanceof Error
  ) {
    return error;
  }

  if (
    typeof error === "string"
  ) {
    return new Error(
      error,
    );
  }

  try {
    return new Error(
      JSON.stringify(
        error,
      ),
    );
  } catch {
    return new Error(
      "Unknown provider error",
    );
  }
}

export class ProviderTimeoutError
  extends Error {
  constructor(
    readonly providerId: string,
    readonly timeoutMs: number,
  ) {
    super(
      `Provider "${providerId}" timed out after ${timeoutMs}ms`,
    );

    this.name =
      "ProviderTimeoutError";
  }
}

export class ProviderCircuitOpenError
  extends Error {
  constructor(
    readonly providerId: string,
  ) {
    super(
      `Circuit breaker is open for provider "${providerId}"`,
    );

    this.name =
      "ProviderCircuitOpenError";
  }
}

export class ResilientProvider
  implements DealProvider {
  private readonly maximumAttempts: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerResetMs: number;
  private readonly now: () => Date;
  private readonly sleep: (
    milliseconds: number,
  ) => Promise<void>;

  private totalExecutions = 0;
  private successfulExecutions = 0;
  private failedExecutions = 0;
  private timedOutExecutions = 0;
  private totalAttempts = 0;
  private consecutiveFailures = 0;
  private circuitOpenedAt:
    Date | null = null;

  constructor(
    private readonly provider:
      DealProvider,

    policy:
      ProviderRetryPolicy = {},

    dependencies:
      ResilientProviderDependencies = {},
  ) {
    this.maximumAttempts =
      normalizePositiveInteger(
        policy.maximumAttempts,
        DEFAULT_MAXIMUM_ATTEMPTS,
        "maximumAttempts",
      );

    this.retryDelayMs =
      normalizeNonNegativeInteger(
        policy.retryDelayMs,
        DEFAULT_RETRY_DELAY_MS,
        "retryDelayMs",
      );

    this.timeoutMs =
      normalizePositiveInteger(
        policy.timeoutMs,
        DEFAULT_TIMEOUT_MS,
        "timeoutMs",
      );

    this.circuitBreakerThreshold =
      normalizePositiveInteger(
        policy.circuitBreakerThreshold,
        DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
        "circuitBreakerThreshold",
      );

    this.circuitBreakerResetMs =
      normalizePositiveInteger(
        policy.circuitBreakerResetMs,
        DEFAULT_CIRCUIT_BREAKER_RESET_MS,
        "circuitBreakerResetMs",
      );

    this.now =
      dependencies.now ??
      (() => new Date());

    this.sleep =
      dependencies.sleep ??
      (
        milliseconds =>
          new Promise(
            resolve => {
              setTimeout(
                resolve,
                milliseconds,
              );
            },
          )
      );
  }

  metadata():
    ProviderMetadata {
    return cloneMetadata(
      this.provider.metadata(),
    );
  }

  async discover(
    context: DiscoveryContext,
  ): Promise<DiscoveryResult> {
    const metadata =
      this.provider.metadata();

    this.ensureCircuitAvailable(
      metadata.id,
    );

    this.totalExecutions++;

    let lastError:
      Error | null = null;

    for (
      let attempt = 1;
      attempt <=
        this.maximumAttempts;
      attempt++
    ) {
      this.totalAttempts++;

      try {
        const result =
          await this.executeWithTimeout(
            metadata.id,
            {
              runId:
                context.runId,

              startedAt:
                cloneDate(
                  context.startedAt,
                ),
            },
          );

        this.successfulExecutions++;
        this.consecutiveFailures = 0;
        this.circuitOpenedAt = null;

        return result;
      } catch (
        error
      ) {
        const normalizedError =
          normalizeError(
            error,
          );

        lastError =
          normalizedError;

        if (
          normalizedError instanceof
          ProviderTimeoutError
        ) {
          this.timedOutExecutions++;
        }

        if (
          attempt <
            this.maximumAttempts &&
          this.retryDelayMs > 0
        ) {
          await this.sleep(
            this.retryDelayMs,
          );
        }
      }
    }

    this.failedExecutions++;
    this.consecutiveFailures++;

    if (
      this.consecutiveFailures >=
      this.circuitBreakerThreshold
    ) {
      this.circuitOpenedAt =
        cloneDate(
          this.now(),
        );
    }

    throw (
      lastError ??
      new Error(
        `Provider "${metadata.id}" failed`,
      )
    );
  }

  statistics():
    ProviderReliabilityStatistics {
    return {
      totalExecutions:
        this.totalExecutions,

      successfulExecutions:
        this.successfulExecutions,

      failedExecutions:
        this.failedExecutions,

      timedOutExecutions:
        this.timedOutExecutions,

      totalAttempts:
        this.totalAttempts,

      consecutiveFailures:
        this.consecutiveFailures,

      circuitOpen:
        this.isCircuitOpen(),

      circuitOpenedAt:
        this.circuitOpenedAt
          ? cloneDate(
              this.circuitOpenedAt,
            )
          : null,
    };
  }

  resetCircuit(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;
  }

  private async executeWithTimeout(
    providerId: string,
    context: DiscoveryContext,
  ): Promise<DiscoveryResult> {
    let timeoutHandle:
      ReturnType<
        typeof setTimeout
      > | null = null;

    const timeoutPromise =
      new Promise<never>(
        (
          _resolve,
          reject,
        ) => {
          timeoutHandle =
            setTimeout(
              () => {
                reject(
                  new ProviderTimeoutError(
                    providerId,
                    this.timeoutMs,
                  ),
                );
              },
              this.timeoutMs,
            );
        },
      );

    try {
      return await Promise.race([
        this.provider.discover(
          context,
        ),
        timeoutPromise,
      ]);
    } finally {
      if (
        timeoutHandle
      ) {
        clearTimeout(
          timeoutHandle,
        );
      }
    }
  }

  private ensureCircuitAvailable(
    providerId: string,
  ): void {
    if (
      !this.circuitOpenedAt
    ) {
      return;
    }

    const elapsed =
      this.now().getTime() -
      this.circuitOpenedAt.getTime();

    if (
      elapsed >=
      this.circuitBreakerResetMs
    ) {
      this.resetCircuit();
      return;
    }

    throw new ProviderCircuitOpenError(
      providerId,
    );
  }

  private isCircuitOpen():
    boolean {
    if (
      !this.circuitOpenedAt
    ) {
      return false;
    }

    const elapsed =
      this.now().getTime() -
      this.circuitOpenedAt.getTime();

    return (
      elapsed <
      this.circuitBreakerResetMs
    );
  }
}
