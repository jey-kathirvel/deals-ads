import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import type {
  HttpMiddleware,
} from "./http-middleware";

import {
  cloneRequest,
} from "./http-utils";

export type HttpCircuitBreakerState =
  | "closed"
  | "open"
  | "half-open";

export interface HttpCircuitBreakerSnapshot {
  key: string;
  state: HttpCircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  openedAt?: number;
  nextAttemptAt?: number;
}

export interface HttpCircuitBreakerStateChange {
  key: string;
  previousState: HttpCircuitBreakerState;
  currentState: HttpCircuitBreakerState;
  snapshot: HttpCircuitBreakerSnapshot;
}

export type HttpCircuitBreakerKeyProvider =
  (
    request: HttpRequest,
  ) => string | Promise<string>;

export type HttpCircuitBreakerFailurePredicate =
  (
    error: unknown,
    request: HttpRequest,
  ) => boolean | Promise<boolean>;

export type HttpCircuitBreakerResponseFailurePredicate =
  (
    response: HttpResponse<unknown>,
    request: HttpRequest,
  ) => boolean | Promise<boolean>;

export type HttpCircuitBreakerStateChangeHook =
  (
    change: HttpCircuitBreakerStateChange,
  ) => void | Promise<void>;

export interface HttpCircuitBreakerMiddlewareOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  successThreshold?: number;
  halfOpenMaxRequests?: number;
  key?: string;
  keyProvider?: HttpCircuitBreakerKeyProvider;
  shouldCountFailure?: HttpCircuitBreakerFailurePredicate;
  shouldCountResponseFailure?: HttpCircuitBreakerResponseFailurePredicate;
  onStateChange?: HttpCircuitBreakerStateChangeHook;
}

interface CircuitState {
  state: HttpCircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  openedAt?: number;
  halfOpenInFlight: number;
}

export class HttpCircuitBreakerOpenError
  extends Error
{
  readonly key: string;

  readonly snapshot:
    HttpCircuitBreakerSnapshot;

  constructor(
    snapshot: HttpCircuitBreakerSnapshot,
  ) {
    super(
      `HTTP circuit breaker is open for key "${snapshot.key}"`,
    );

    this.name =
      "HttpCircuitBreakerOpenError";

    this.key =
      snapshot.key;

    this.snapshot =
      snapshot;
  }
}

function validatePositiveInteger(
  name: string,
  value: number,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer`,
    );
  }
}

function validatePositiveNumber(
  name: string,
  value: number,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be greater than 0`,
    );
  }
}

export class HttpCircuitBreakerMiddleware
  implements HttpMiddleware
{
  private readonly failureThreshold:
    number;

  private readonly resetTimeoutMs:
    number;

  private readonly successThreshold:
    number;

  private readonly halfOpenMaxRequests:
    number;

  private readonly key:
    string;

  private readonly keyProvider?:
    HttpCircuitBreakerKeyProvider;

  private readonly shouldCountFailure:
    HttpCircuitBreakerFailurePredicate;

  private readonly shouldCountResponseFailure:
    HttpCircuitBreakerResponseFailurePredicate;

  private readonly onStateChange?:
    HttpCircuitBreakerStateChangeHook;

  private readonly circuits =
    new Map<string, CircuitState>();

  constructor(
    options: HttpCircuitBreakerMiddlewareOptions,
  ) {
    validatePositiveInteger(
      "HTTP circuit breaker failureThreshold",
      options.failureThreshold,
    );

    validatePositiveNumber(
      "HTTP circuit breaker resetTimeoutMs",
      options.resetTimeoutMs,
    );

    const successThreshold =
      options.successThreshold ?? 1;

    validatePositiveInteger(
      "HTTP circuit breaker successThreshold",
      successThreshold,
    );

    const halfOpenMaxRequests =
      options.halfOpenMaxRequests ?? 1;

    validatePositiveInteger(
      "HTTP circuit breaker halfOpenMaxRequests",
      halfOpenMaxRequests,
    );

    if (
      options.key &&
      options.keyProvider
    ) {
      throw new Error(
        "HTTP circuit breaker middleware cannot use both key and keyProvider",
      );
    }

    this.failureThreshold =
      options.failureThreshold;

    this.resetTimeoutMs =
      options.resetTimeoutMs;

    this.successThreshold =
      successThreshold;

    this.halfOpenMaxRequests =
      halfOpenMaxRequests;

    this.key =
      options.key ?? "default";

    this.keyProvider =
      options.keyProvider;

    this.shouldCountFailure =
      options.shouldCountFailure ??
      (() => true);

    this.shouldCountResponseFailure =
      options.shouldCountResponseFailure ??
      ((response) =>
        response.status >= 500);

    this.onStateChange =
      options.onStateChange;
  }

  async intercept<TBody = unknown>(
    request: HttpRequest,
    next: HttpClient,
  ): Promise<HttpResponse<TBody>> {
    const clonedRequest =
      cloneRequest(request);

    const key =
      await this.resolveKey(
        clonedRequest,
      );

    const circuit =
      this.getCircuit(
        key,
      );

    await this.prepareRequest(
      key,
      circuit,
    );

    let halfOpenSlotHeld =
      circuit.state === "half-open";

    try {
      const response =
        await next.request<TBody>(
          clonedRequest,
        );

      const responseFailed =
        await this.shouldCountResponseFailure(
          response as HttpResponse<unknown>,
          cloneRequest(clonedRequest),
        );

      if (
        responseFailed
      ) {
        await this.recordFailure(
          key,
          circuit,
        );
      } else {
        await this.recordSuccess(
          key,
          circuit,
        );
      }

      halfOpenSlotHeld =
        false;

      return response;
    } catch (
      error
    ) {
      const countFailure =
        await this.shouldCountFailure(
          error,
          cloneRequest(clonedRequest),
        );

      if (
        countFailure
      ) {
        await this.recordFailure(
          key,
          circuit,
        );
      } else if (
        circuit.state === "half-open"
      ) {
        circuit.halfOpenInFlight =
          Math.max(
            0,
            circuit.halfOpenInFlight - 1,
          );
      }

      halfOpenSlotHeld =
        false;

      throw error;
    } finally {
      if (
        halfOpenSlotHeld &&
        circuit.state === "half-open"
      ) {
        circuit.halfOpenInFlight =
          Math.max(
            0,
            circuit.halfOpenInFlight - 1,
          );
      }
    }
  }

  getSnapshot(
    key = this.key,
  ): HttpCircuitBreakerSnapshot {
    const circuit =
      this.getCircuit(
        key,
      );

    return this.createSnapshot(
      key,
      circuit,
    );
  }

  reset(
    key = this.key,
  ): void {
    this.circuits.delete(
      key,
    );
  }

  private async resolveKey(
    request: HttpRequest,
  ): Promise<string> {
    const resolved =
      this.keyProvider
        ? await this.keyProvider(
            cloneRequest(request),
          )
        : this.key;

    const normalized =
      resolved.trim();

    if (
      normalized.length === 0
    ) {
      throw new Error(
        "HTTP circuit breaker key cannot be empty",
      );
    }

    return normalized;
  }

  private getCircuit(
    key: string,
  ): CircuitState {
    const existing =
      this.circuits.get(key);

    if (
      existing
    ) {
      return existing;
    }

    const created:
      CircuitState = {
        state:
          "closed",
        consecutiveFailures:
          0,
        consecutiveSuccesses:
          0,
        halfOpenInFlight:
          0,
      };

    this.circuits.set(
      key,
      created,
    );

    return created;
  }

  private async prepareRequest(
    key: string,
    circuit: CircuitState,
  ): Promise<void> {
    if (
      circuit.state === "open"
    ) {
      const openedAt =
        circuit.openedAt ??
        Date.now();

      const nextAttemptAt =
        openedAt +
        this.resetTimeoutMs;

      if (
        Date.now() <
        nextAttemptAt
      ) {
        throw new HttpCircuitBreakerOpenError(
          this.createSnapshot(
            key,
            circuit,
          ),
        );
      }

      await this.transition(
        key,
        circuit,
        "half-open",
      );
    }

    if (
      circuit.state === "half-open"
    ) {
      if (
        circuit.halfOpenInFlight >=
        this.halfOpenMaxRequests
      ) {
        throw new HttpCircuitBreakerOpenError(
          this.createSnapshot(
            key,
            circuit,
          ),
        );
      }

      circuit.halfOpenInFlight +=
        1;
    }
  }

  private async recordFailure(
    key: string,
    circuit: CircuitState,
  ): Promise<void> {
    if (
      circuit.state === "half-open"
    ) {
      circuit.halfOpenInFlight =
        Math.max(
          0,
          circuit.halfOpenInFlight - 1,
        );

      circuit.consecutiveFailures +=
        1;

      circuit.consecutiveSuccesses =
        0;

      await this.transition(
        key,
        circuit,
        "open",
      );

      return;
    }

    circuit.consecutiveFailures +=
      1;

    circuit.consecutiveSuccesses =
      0;

    if (
      circuit.consecutiveFailures >=
      this.failureThreshold
    ) {
      await this.transition(
        key,
        circuit,
        "open",
      );
    }
  }

  private async recordSuccess(
    key: string,
    circuit: CircuitState,
  ): Promise<void> {
    if (
      circuit.state === "half-open"
    ) {
      circuit.halfOpenInFlight =
        Math.max(
          0,
          circuit.halfOpenInFlight - 1,
        );

      circuit.consecutiveSuccesses +=
        1;

      circuit.consecutiveFailures =
        0;

      if (
        circuit.consecutiveSuccesses >=
        this.successThreshold
      ) {
        await this.transition(
          key,
          circuit,
          "closed",
        );
      }

      return;
    }

    circuit.consecutiveFailures =
      0;

    circuit.consecutiveSuccesses =
      0;
  }

  private async transition(
    key: string,
    circuit: CircuitState,
    nextState: HttpCircuitBreakerState,
  ): Promise<void> {
    const previousState =
      circuit.state;

    if (
      previousState === nextState
    ) {
      if (
        nextState === "open"
      ) {
        circuit.openedAt =
          Date.now();

        circuit.halfOpenInFlight =
          0;
      }

      return;
    }

    circuit.state =
      nextState;

    if (
      nextState === "open"
    ) {
      circuit.openedAt =
        Date.now();

      circuit.consecutiveSuccesses =
        0;

      circuit.halfOpenInFlight =
        0;
    }

    if (
      nextState === "half-open"
    ) {
      circuit.consecutiveFailures =
        0;

      circuit.consecutiveSuccesses =
        0;

      circuit.halfOpenInFlight =
        0;
    }

    if (
      nextState === "closed"
    ) {
      circuit.consecutiveFailures =
        0;

      circuit.consecutiveSuccesses =
        0;

      circuit.openedAt =
        undefined;

      circuit.halfOpenInFlight =
        0;
    }

    await this.onStateChange?.({
      key,
      previousState,
      currentState:
        nextState,
      snapshot:
        this.createSnapshot(
          key,
          circuit,
        ),
    });
  }

  private createSnapshot(
    key: string,
    circuit: CircuitState,
  ): HttpCircuitBreakerSnapshot {
    const openedAt =
      circuit.openedAt;

    return {
      key,
      state:
        circuit.state,
      consecutiveFailures:
        circuit.consecutiveFailures,
      consecutiveSuccesses:
        circuit.consecutiveSuccesses,
      openedAt,
      nextAttemptAt:
        openedAt === undefined
          ? undefined
          : openedAt +
            this.resetTimeoutMs,
    };
  }
}
