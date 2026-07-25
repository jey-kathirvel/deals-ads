import type {
  DiscoveryContext,
} from "./provider";

import type {
  ProviderDiscoveryCoordinator,
  ProviderDiscoveryCoordinatorOptions,
  ProviderDiscoveryCoordinatorSummary,
} from "./provider-discovery-coordinator";

export enum ProviderRunStatus {
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  PARTIAL = "partial",
  FAILED = "failed",
}

export interface ProviderRunRecord {
  runId: string;
  status: ProviderRunStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  requestedProviders: number;
  executedProviders: number;
  successfulProviders: number;
  failedProviders: number;
  skippedProviders: number;
  discoveredDeals: number;
  acceptedDeals: number;
  duplicateDeals: number;
  insertedDeals: number;
  updatedDeals: number;
  skippedDeals: number;
  failureMessages: string[];
}

export interface ProviderRunHistoryQuery {
  status?: ProviderRunStatus;
  limit?: number;
  offset?: number;
}

export interface ProviderRunHistoryResult {
  total: number;
  limit: number;
  offset: number;
  records: ProviderRunRecord[];
}

export interface ProviderRunHistoryDependencies {
  now?: () => Date;
}

const DEFAULT_LIMIT = 50;
const MAXIMUM_LIMIT = 500;

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function cloneRecord(
  record: ProviderRunRecord,
): ProviderRunRecord {
  return {
    ...record,

    startedAt:
      cloneDate(
        record.startedAt,
      ),

    completedAt:
      record.completedAt
        ? cloneDate(
            record.completedAt,
          )
        : null,

    failureMessages: [
      ...record.failureMessages,
    ],
  };
}

function normalizeLimit(
  value: number | undefined,
): number {
  const resolved =
    value ?? DEFAULT_LIMIT;

  if (
    !Number.isInteger(
      resolved,
    ) ||
    resolved < 1 ||
    resolved > MAXIMUM_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${MAXIMUM_LIMIT}`,
    );
  }

  return resolved;
}

function normalizeOffset(
  value: number | undefined,
): number {
  const resolved =
    value ?? 0;

  if (
    !Number.isInteger(
      resolved,
    ) ||
    resolved < 0
  ) {
    throw new Error(
      "offset must be a non-negative integer",
    );
  }

  return resolved;
}

function normalizeError(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error,
    );
  } catch {
    return "Unknown discovery run error";
  }
}

export class ProviderRunHistoryService {
  private readonly records =
    new Map<
      string,
      ProviderRunRecord
    >();

  private readonly now:
    () => Date;

  constructor(
    private readonly coordinator:
      ProviderDiscoveryCoordinator,

    dependencies:
      ProviderRunHistoryDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date());
  }

  async execute(
    context: DiscoveryContext,
    options:
      ProviderDiscoveryCoordinatorOptions = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    if (
      this.records.has(
        context.runId,
      )
    ) {
      throw new Error(
        `Discovery run "${context.runId}" already exists`,
      );
    }

    const startedAt =
      cloneDate(
        context.startedAt,
      );

    this.records.set(
      context.runId,
      {
        runId:
          context.runId,

        status:
          ProviderRunStatus.RUNNING,

        startedAt,

        completedAt:
          null,

        durationMs:
          null,

        requestedProviders:
          0,

        executedProviders:
          0,

        successfulProviders:
          0,

        failedProviders:
          0,

        skippedProviders:
          0,

        discoveredDeals:
          0,

        acceptedDeals:
          0,

        duplicateDeals:
          0,

        insertedDeals:
          0,

        updatedDeals:
          0,

        skippedDeals:
          0,

        failureMessages:
          [],
      },
    );

    try {
      const summary =
        await this.coordinator.run(
          {
            runId:
              context.runId,

            startedAt:
              cloneDate(
                context.startedAt,
              ),
          },
          options,
        );

      const completedAt =
        cloneDate(
          summary.execution.completedAt,
        );

      const status =
        summary.execution.failedProviders === 0
          ? ProviderRunStatus.SUCCEEDED
          : summary.execution.successfulProviders > 0
            ? ProviderRunStatus.PARTIAL
            : ProviderRunStatus.FAILED;

      this.records.set(
        context.runId,
        {
          runId:
            context.runId,

          status,

          startedAt,

          completedAt,

          durationMs:
            summary.execution.durationMs,

          requestedProviders:
            summary.execution.requestedProviders,

          executedProviders:
            summary.execution.executedProviders,

          successfulProviders:
            summary.execution.successfulProviders,

          failedProviders:
            summary.execution.failedProviders,

          skippedProviders:
            summary.execution.skippedProviders,

          discoveredDeals:
            summary.discovered,

          acceptedDeals:
            summary.accepted,

          duplicateDeals:
            summary.duplicates,

          insertedDeals:
            summary.inserted,

          updatedDeals:
            summary.updated,

          skippedDeals:
            summary.skipped,

          failureMessages:
            summary.execution.failures.map(
              failure =>
                `${failure.providerId}: ${failure.error}`,
            ),
        },
      );

      return summary;
    } catch (
      error
    ) {
      const completedAt =
        this.now();

      const current =
        this.records.get(
          context.runId,
        );

      this.records.set(
        context.runId,
        {
          ...(current ?? {
            runId:
              context.runId,

            startedAt,

            requestedProviders:
              0,

            executedProviders:
              0,

            successfulProviders:
              0,

            failedProviders:
              0,

            skippedProviders:
              0,

            discoveredDeals:
              0,

            acceptedDeals:
              0,

            duplicateDeals:
              0,

            insertedDeals:
              0,

            updatedDeals:
              0,

            skippedDeals:
              0,

            failureMessages:
              [],
          }),

          status:
            ProviderRunStatus.FAILED,

          completedAt:
            cloneDate(
              completedAt,
            ),

          durationMs:
            Math.max(
              0,
              completedAt.getTime() -
                startedAt.getTime(),
            ),

          failureMessages: [
            normalizeError(
              error,
            ),
          ],
        },
      );

      throw error;
    }
  }

  get(
    runId: string,
  ): ProviderRunRecord | null {
    const record =
      this.records.get(
        runId,
      );

    return record
      ? cloneRecord(
          record,
        )
      : null;
  }

  latest():
    ProviderRunRecord | null {
    const records =
      this.sortedRecords();

    return records.length > 0
      ? cloneRecord(
          records[0],
        )
      : null;
  }

  list(
    query:
      ProviderRunHistoryQuery = {},
  ): ProviderRunHistoryResult {
    const limit =
      normalizeLimit(
        query.limit,
      );

    const offset =
      normalizeOffset(
        query.offset,
      );

    const filtered =
      this.sortedRecords().filter(
        record =>
          !query.status ||
          record.status ===
            query.status,
      );

    return {
      total:
        filtered.length,

      limit,

      offset,

      records:
        filtered
          .slice(
            offset,
            offset + limit,
          )
          .map(
            cloneRecord,
          ),
    };
  }

  count(
    status?: ProviderRunStatus,
  ): number {
    if (
      !status
    ) {
      return this.records.size;
    }

    return [
      ...this.records.values(),
    ].filter(
      record =>
        record.status ===
        status,
    ).length;
  }

  clear(): void {
    this.records.clear();
  }

  private sortedRecords():
    ProviderRunRecord[] {
    return [
      ...this.records.values(),
    ].sort(
      (
        left,
        right,
      ) => {
        const startedDifference =
          right.startedAt.getTime() -
          left.startedAt.getTime();

        if (
          startedDifference !== 0
        ) {
          return startedDifference;
        }

        return right.runId.localeCompare(
          left.runId,
        );
      },
    );
  }
}
