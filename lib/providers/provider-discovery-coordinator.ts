import type {
  DealRecord,
} from "../database/models";

import type {
  DiscoveryPersistenceService,
  DuplicateDetectionService,
} from "../database/services";

import type {
  DiscoveryContext,
} from "./provider";

import type {
  ProviderExecutionEngine,
  ProviderExecutionOptions,
  ProviderExecutionSummary,
} from "./provider-execution-engine";

export interface ProviderDiscoveryCoordinatorOptions
  extends ProviderExecutionOptions {
  persist?: boolean;
}

export interface ProviderDiscoveryCoordinatorSummary {
  runId: string;
  execution: ProviderExecutionSummary;
  discovered: number;
  accepted: number;
  duplicates: number;
  inserted: number;
  updated: number;
  skipped: number;
  acceptedDeals: DealRecord[];
  duplicateDeals: DealRecord[];
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function cloneDeal(
  deal: DealRecord,
): DealRecord {
  return {
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
  };
}

export class ProviderDiscoveryCoordinator {
  constructor(
    private readonly executionEngine:
      ProviderExecutionEngine,

    private readonly duplicateDetectionService:
      DuplicateDetectionService,

    private readonly discoveryPersistenceService:
      DiscoveryPersistenceService,
  ) {}

  async run(
    context: DiscoveryContext,
    options:
      ProviderDiscoveryCoordinatorOptions = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    const {
      persist = true,
      ...executionOptions
    } = options;

    const execution =
      await this.executionEngine.execute(
        context,
        executionOptions,
      );

    const duplicateResult =
      await this.duplicateDetectionService.filter(
        execution.deals,
      );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (
      persist &&
      duplicateResult.accepted.length > 0
    ) {
      const persistenceResult =
        await this.discoveryPersistenceService.persist(
          duplicateResult.accepted,
        );

      inserted =
        persistenceResult.inserted;

      updated =
        persistenceResult.updated;

      skipped =
        persistenceResult.skipped;
    }

    return {
      runId:
        context.runId,

      execution,

      discovered:
        execution.deals.length,

      accepted:
        duplicateResult.accepted.length,

      duplicates:
        duplicateResult.duplicates.length,

      inserted,

      updated,

      skipped,

      acceptedDeals:
        duplicateResult.accepted.map(
          cloneDeal,
        ),

      duplicateDeals:
        duplicateResult.duplicates.map(
          cloneDeal,
        ),
    };
  }

  async runProvider(
    providerId: string,
    context: DiscoveryContext,
    options:
      Omit<
        ProviderDiscoveryCoordinatorOptions,
        "providerIds"
      > = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    return this.run(
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
