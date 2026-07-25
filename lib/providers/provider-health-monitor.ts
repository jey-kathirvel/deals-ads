import type {
  ProviderMetadata,
} from "./provider";

import type {
  ProviderReliabilityStatistics,
  ResilientProvider,
} from "./resilient-provider";

export enum ProviderHealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  CIRCUIT_OPEN = "circuit_open",
  UNKNOWN = "unknown",
}

export interface ProviderHealthThresholds {
  minimumExecutions?: number;
  degradedFailureRate?: number;
  unhealthyFailureRate?: number;
  degradedConsecutiveFailures?: number;
  unhealthyConsecutiveFailures?: number;
}

export interface ProviderHealthSnapshot {
  providerId: string;
  providerName: string;
  enabled: boolean;
  priority: number;
  status: ProviderHealthStatus;
  failureRate: number;
  successRate: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  totalAttempts: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenedAt: Date | null;
  checkedAt: Date;
}

export interface ProviderHealthSummary {
  checkedAt: Date;
  totalProviders: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  circuitOpen: number;
  unknown: number;
  providers: ProviderHealthSnapshot[];
}

export interface ProviderHealthMonitorDependencies {
  now?: () => Date;
}

interface RegisteredProvider {
  provider: ResilientProvider;
}

const DEFAULT_MINIMUM_EXECUTIONS = 1;
const DEFAULT_DEGRADED_FAILURE_RATE = 0.25;
const DEFAULT_UNHEALTHY_FAILURE_RATE = 0.5;
const DEFAULT_DEGRADED_CONSECUTIVE_FAILURES = 1;
const DEFAULT_UNHEALTHY_CONSECUTIVE_FAILURES = 3;

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

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

function normalizeRate(
  value: number | undefined,
  fallback: number,
  field: string,
): number {
  const resolved =
    value ?? fallback;

  if (
    !Number.isFinite(
      resolved,
    ) ||
    resolved < 0 ||
    resolved > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1`,
    );
  }

  return resolved;
}

function cloneMetadata(
  metadata: ProviderMetadata,
): ProviderMetadata {
  return {
    ...metadata,
  };
}

function cloneStatistics(
  statistics: ProviderReliabilityStatistics,
): ProviderReliabilityStatistics {
  return {
    ...statistics,

    circuitOpenedAt:
      statistics.circuitOpenedAt
        ? cloneDate(
            statistics.circuitOpenedAt,
          )
        : null,
  };
}

export class ProviderHealthMonitor {
  private readonly providers =
    new Map<
      string,
      RegisteredProvider
    >();

  private readonly minimumExecutions: number;
  private readonly degradedFailureRate: number;
  private readonly unhealthyFailureRate: number;
  private readonly degradedConsecutiveFailures: number;
  private readonly unhealthyConsecutiveFailures: number;
  private readonly now: () => Date;

  constructor(
    thresholds:
      ProviderHealthThresholds = {},

    dependencies:
      ProviderHealthMonitorDependencies = {},
  ) {
    this.minimumExecutions =
      normalizePositiveInteger(
        thresholds.minimumExecutions,
        DEFAULT_MINIMUM_EXECUTIONS,
        "minimumExecutions",
      );

    this.degradedFailureRate =
      normalizeRate(
        thresholds.degradedFailureRate,
        DEFAULT_DEGRADED_FAILURE_RATE,
        "degradedFailureRate",
      );

    this.unhealthyFailureRate =
      normalizeRate(
        thresholds.unhealthyFailureRate,
        DEFAULT_UNHEALTHY_FAILURE_RATE,
        "unhealthyFailureRate",
      );

    this.degradedConsecutiveFailures =
      normalizePositiveInteger(
        thresholds.degradedConsecutiveFailures,
        DEFAULT_DEGRADED_CONSECUTIVE_FAILURES,
        "degradedConsecutiveFailures",
      );

    this.unhealthyConsecutiveFailures =
      normalizePositiveInteger(
        thresholds.unhealthyConsecutiveFailures,
        DEFAULT_UNHEALTHY_CONSECUTIVE_FAILURES,
        "unhealthyConsecutiveFailures",
      );

    if (
      this.degradedFailureRate >
      this.unhealthyFailureRate
    ) {
      throw new Error(
        "degradedFailureRate cannot exceed unhealthyFailureRate",
      );
    }

    if (
      this.degradedConsecutiveFailures >
      this.unhealthyConsecutiveFailures
    ) {
      throw new Error(
        "degradedConsecutiveFailures cannot exceed unhealthyConsecutiveFailures",
      );
    }

    this.now =
      dependencies.now ??
      (() => new Date());
  }

  register(
    provider: ResilientProvider,
  ): void {
    const metadata =
      provider.metadata();

    if (
      this.providers.has(
        metadata.id,
      )
    ) {
      throw new Error(
        `Provider "${metadata.id}" is already registered for health monitoring`,
      );
    }

    this.providers.set(
      metadata.id,
      {
        provider,
      },
    );
  }

  unregister(
    providerId: string,
  ): boolean {
    return this.providers.delete(
      providerId,
    );
  }

  has(
    providerId: string,
  ): boolean {
    return this.providers.has(
      providerId,
    );
  }

  get(
    providerId: string,
  ): ProviderHealthSnapshot | null {
    const entry =
      this.providers.get(
        providerId,
      );

    if (
      !entry
    ) {
      return null;
    }

    return this.createSnapshot(
      entry.provider,
      this.now(),
    );
  }

  list():
    ProviderHealthSnapshot[] {
    const checkedAt =
      this.now();

    return [
      ...this.providers.values(),
    ]
      .map(
        entry =>
          this.createSnapshot(
            entry.provider,
            checkedAt,
          ),
      )
      .sort(
        (
          left,
          right,
        ) => {
          if (
            left.priority !==
            right.priority
          ) {
            return (
              left.priority -
              right.priority
            );
          }

          return left.providerId.localeCompare(
            right.providerId,
          );
        },
      );
  }

  summary():
    ProviderHealthSummary {
    const checkedAt =
      this.now();

    const providers =
      [
        ...this.providers.values(),
      ]
        .map(
          entry =>
            this.createSnapshot(
              entry.provider,
              checkedAt,
            ),
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (
              left.priority !==
              right.priority
            ) {
              return (
                left.priority -
                right.priority
              );
            }

            return left.providerId.localeCompare(
              right.providerId,
            );
          },
        );

    return {
      checkedAt:
        cloneDate(
          checkedAt,
        ),

      totalProviders:
        providers.length,

      healthy:
        providers.filter(
          provider =>
            provider.status ===
            ProviderHealthStatus.HEALTHY,
        ).length,

      degraded:
        providers.filter(
          provider =>
            provider.status ===
            ProviderHealthStatus.DEGRADED,
        ).length,

      unhealthy:
        providers.filter(
          provider =>
            provider.status ===
            ProviderHealthStatus.UNHEALTHY,
        ).length,

      circuitOpen:
        providers.filter(
          provider =>
            provider.status ===
            ProviderHealthStatus.CIRCUIT_OPEN,
        ).length,

      unknown:
        providers.filter(
          provider =>
            provider.status ===
            ProviderHealthStatus.UNKNOWN,
        ).length,

      providers,
    };
  }

  resetCircuit(
    providerId: string,
  ): void {
    const entry =
      this.providers.get(
        providerId,
      );

    if (
      !entry
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered for health monitoring`,
      );
    }

    entry.provider.resetCircuit();
  }

  private createSnapshot(
    provider: ResilientProvider,
    checkedAt: Date,
  ): ProviderHealthSnapshot {
    const metadata =
      cloneMetadata(
        provider.metadata(),
      );

    const statistics =
      cloneStatistics(
        provider.statistics(),
      );

    const failureRate =
      statistics.totalExecutions > 0
        ? statistics.failedExecutions /
          statistics.totalExecutions
        : 0;

    const successRate =
      statistics.totalExecutions > 0
        ? statistics.successfulExecutions /
          statistics.totalExecutions
        : 0;

    return {
      providerId:
        metadata.id,

      providerName:
        metadata.name,

      enabled:
        metadata.enabled,

      priority:
        metadata.priority,

      status:
        this.resolveStatus(
          statistics,
          failureRate,
        ),

      failureRate,

      successRate,

      totalExecutions:
        statistics.totalExecutions,

      successfulExecutions:
        statistics.successfulExecutions,

      failedExecutions:
        statistics.failedExecutions,

      timedOutExecutions:
        statistics.timedOutExecutions,

      totalAttempts:
        statistics.totalAttempts,

      consecutiveFailures:
        statistics.consecutiveFailures,

      circuitOpen:
        statistics.circuitOpen,

      circuitOpenedAt:
        statistics.circuitOpenedAt
          ? cloneDate(
              statistics.circuitOpenedAt,
            )
          : null,

      checkedAt:
        cloneDate(
          checkedAt,
        ),
    };
  }

  private resolveStatus(
    statistics:
      ProviderReliabilityStatistics,

    failureRate: number,
  ): ProviderHealthStatus {
    if (
      statistics.circuitOpen
    ) {
      return ProviderHealthStatus.CIRCUIT_OPEN;
    }

    if (
      statistics.totalExecutions <
      this.minimumExecutions
    ) {
      return ProviderHealthStatus.UNKNOWN;
    }

    if (
      statistics.consecutiveFailures >=
        this.unhealthyConsecutiveFailures ||
      failureRate >=
        this.unhealthyFailureRate
    ) {
      return ProviderHealthStatus.UNHEALTHY;
    }

    if (
      statistics.consecutiveFailures >=
        this.degradedConsecutiveFailures ||
      failureRate >=
        this.degradedFailureRate
    ) {
      return ProviderHealthStatus.DEGRADED;
    }

    return ProviderHealthStatus.HEALTHY;
  }
}
