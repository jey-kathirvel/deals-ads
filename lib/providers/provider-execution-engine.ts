import type {
  DealRecord,
} from "../database/models";

import type {
  DealProvider,
  DiscoveryContext,
  DiscoveryResult,
  ProviderMetadata,
} from "./provider";

import type {
  ProviderRegistry,
} from "./provider-registry";

export interface ProviderExecutionFailure {
  providerId: string;
  providerName: string;
  error: string;
}

export interface ProviderExecutionEntry {
  metadata: ProviderMetadata;
  result: DiscoveryResult;
}

export interface ProviderExecutionSummary {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  requestedProviders: number;
  executedProviders: number;
  skippedProviders: number;
  successfulProviders: number;
  failedProviders: number;
  discoveredDeals: number;
  results: ProviderExecutionEntry[];
  failures: ProviderExecutionFailure[];
  deals: DealRecord[];
}

export interface ProviderExecutionOptions {
  providerIds?: string[];
  includeDisabled?: boolean;
  continueOnError?: boolean;
  now?: () => Date;
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
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
    return "Unknown provider execution error";
  }
}

export class ProviderExecutionEngine {
  constructor(
    private readonly registry:
      ProviderRegistry,
  ) {}

  async execute(
    context: DiscoveryContext,
    options: ProviderExecutionOptions = {},
  ): Promise<ProviderExecutionSummary> {
    const now =
      options.now ??
      (() => new Date());

    const startedAt =
      cloneDate(
        context.startedAt,
      );

    const providerIdFilter =
      options.providerIds
        ? new Set(
            options.providerIds,
          )
        : null;

    const registeredProviders =
      this.registry.list();

    const requestedProviders =
      providerIdFilter
        ? registeredProviders.filter(
            provider =>
              providerIdFilter.has(
                provider.metadata().id,
              ),
          )
        : registeredProviders;

    const providersToExecute =
      requestedProviders.filter(
        provider =>
          options.includeDisabled === true ||
          provider.metadata().enabled,
      );

    const skippedProviders =
      requestedProviders.length -
      providersToExecute.length;

    const results:
      ProviderExecutionEntry[] = [];

    const failures:
      ProviderExecutionFailure[] = [];

    const deals:
      DealRecord[] = [];

    for (
      const provider of
      providersToExecute
    ) {
      const metadata =
        provider.metadata();

      try {
        const result =
          await provider.discover({
            runId:
              context.runId,

            startedAt:
              cloneDate(
                context.startedAt,
              ),
          });

        if (
          result.providerId !==
          metadata.id
        ) {
          throw new Error(
            `Provider result id mismatch: expected "${metadata.id}" but received "${result.providerId}"`,
          );
        }

        results.push({
          metadata: {
            ...metadata,
          },

          result: {
            ...result,

            discovered:
              result.discovered.map(
                deal => ({
                  ...deal,

                  discoveredAt:
                    cloneDate(
                      deal.discoveredAt,
                    ),

                  expiresAt:
                    deal.expiresAt
                      ? cloneDate(
                          deal.expiresAt,
                        )
                      : null,

                  publishedAt:
                    deal.publishedAt
                      ? cloneDate(
                          deal.publishedAt,
                        )
                      : null,

                  archivedAt:
                    deal.archivedAt
                      ? cloneDate(
                          deal.archivedAt,
                        )
                      : null,

                  createdAt:
                    cloneDate(
                      deal.createdAt,
                    ),

                  updatedAt:
                    cloneDate(
                      deal.updatedAt,
                    ),
                }),
              ),
          },
        });

        deals.push(
          ...result.discovered.map(
            deal => ({
              ...deal,

              discoveredAt:
                cloneDate(
                  deal.discoveredAt,
                ),

              expiresAt:
                deal.expiresAt
                  ? cloneDate(
                      deal.expiresAt,
                    )
                  : null,

              publishedAt:
                deal.publishedAt
                  ? cloneDate(
                      deal.publishedAt,
                    )
                  : null,

              archivedAt:
                deal.archivedAt
                  ? cloneDate(
                      deal.archivedAt,
                    )
                  : null,

              createdAt:
                cloneDate(
                  deal.createdAt,
                ),

              updatedAt:
                cloneDate(
                  deal.updatedAt,
                ),
            }),
          ),
        );
      } catch (
        error
      ) {
        failures.push({
          providerId:
            metadata.id,

          providerName:
            metadata.name,

          error:
            normalizeError(
              error,
            ),
        });

        if (
          options.continueOnError ===
          false
        ) {
          throw error;
        }
      }
    }

    const completedAt =
      now();

    return {
      runId:
        context.runId,

      startedAt:
        cloneDate(
          startedAt,
        ),

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

      requestedProviders:
        requestedProviders.length,

      executedProviders:
        providersToExecute.length,

      skippedProviders,

      successfulProviders:
        results.length,

      failedProviders:
        failures.length,

      discoveredDeals:
        deals.length,

      results,

      failures,

      deals,
    };
  }

  async executeProvider(
    providerId: string,
    context: DiscoveryContext,
    options: Omit<
      ProviderExecutionOptions,
      "providerIds"
    > = {},
  ): Promise<ProviderExecutionSummary> {
    const provider =
      this.registry.get(
        providerId,
      );

    if (
      !provider
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered`,
      );
    }

    return this.execute(
      context,
      {
        ...options,

        providerIds: [
          providerId,
        ],
      },
    );
  }
}
