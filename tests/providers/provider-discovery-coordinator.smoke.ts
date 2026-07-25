import assert from "node:assert/strict";

import {
  DealSource,
  DealStatus,
} from "../../lib/database/models";

import type {
  DealRecord,
} from "../../lib/database/models";

import {
  InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
  DiscoveryPersistenceService,
  DuplicateDetectionService,
} from "../../lib/database/services";

import {
  ProviderDiscoveryCoordinator,
  ProviderExecutionEngine,
  ProviderRegistry,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T00:00:02.000Z",
  );

function createDeal(
  id: string,
  externalId: string,
  source: DealSource,
  overrides:
    Partial<DealRecord> = {},
): DealRecord {
  return {
    id,

    externalId,

    source,

    status:
      overrides.status ??
      DealStatus.DISCOVERED,

    title:
      overrides.title ??
      `Product ${id}`,

    url:
      overrides.url ??
      `https://example.com/${id}`,

    imageUrl:
      overrides.imageUrl ??
      `https://images.example.com/${id}.jpg`,

    category:
      overrides.category ??
      "Electronics",

    currency:
      overrides.currency ??
      "INR",

    currentPrice:
      overrides.currentPrice ??
      800,

    originalPrice:
      overrides.originalPrice ??
      1000,

    discountPercentage:
      overrides.discountPercentage ??
      20,

    score:
      overrides.score ??
      90,

    discoveredAt:
      overrides.discoveredAt ??
      startedAt,

    expiresAt:
      overrides.expiresAt ??
      new Date(
        "2026-08-10T00:00:00.000Z",
      ),

    publishedAt:
      overrides.publishedAt ??
      null,

    archivedAt:
      overrides.archivedAt ??
      null,

    createdAt:
      overrides.createdAt ??
      startedAt,

    updatedAt:
      overrides.updatedAt ??
      startedAt,
  };
}

const repository =
  new InMemoryDealRepository();

await repository.create(
  createDeal(
    "existing-amazon-deal",
    "amazon-existing",
    DealSource.AMAZON,
  ),
);

const registry =
  new ProviderRegistry();

registry.register({
  metadata() {
    return {
      id:
        "amazon",

      name:
        "Amazon",

      enabled:
        true,

      priority:
        1,
    };
  },

  async discover() {
    return {
      providerId:
        "amazon",

      discovered: [
        createDeal(
          "amazon-001",
          "amazon-001",
          DealSource.AMAZON,
          {
            score:
              95,
          },
        ),

        createDeal(
          "amazon-duplicate-batch",
          "amazon-001",
          DealSource.AMAZON,
          {
            score:
              80,
          },
        ),

        createDeal(
          "amazon-existing-copy",
          "amazon-existing",
          DealSource.AMAZON,
          {
            score:
              85,
          },
        ),
      ],

      durationMs:
        100,
    };
  },
});

registry.register({
  metadata() {
    return {
      id:
        "flipkart",

      name:
        "Flipkart",

      enabled:
        true,

      priority:
        2,
    };
  },

  async discover() {
    return {
      providerId:
        "flipkart",

      discovered: [
        createDeal(
          "flipkart-001",
          "flipkart-001",
          DealSource.FLIPKART,
          {
            score:
              92,
          },
        ),
      ],

      durationMs:
        120,
    };
  },
});

const executionEngine =
  new ProviderExecutionEngine(
    registry,
  );

const duplicateDetectionService =
  new DuplicateDetectionService(
    repository,
  );

const discoveryPersistenceService =
  new DiscoveryPersistenceService(
    repository,
  );

const coordinator =
  new ProviderDiscoveryCoordinator(
    executionEngine,
    duplicateDetectionService,
    discoveryPersistenceService,
  );

const result =
  await coordinator.run(
    {
      runId:
        "run-005c",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,

      continueOnError:
        true,

      persist:
        true,
    },
  );

assert.equal(
  result.runId,
  "run-005c",
);

assert.equal(
  result.execution.successfulProviders,
  2,
);

assert.equal(
  result.execution.failedProviders,
  0,
);

assert.equal(
  result.discovered,
  4,
);

assert.equal(
  result.accepted,
  2,
);

assert.equal(
  result.duplicates,
  2,
);

assert.equal(
  result.inserted,
  2,
);

assert.equal(
  result.updated,
  0,
);

assert.equal(
  result.skipped,
  0,
);

assert.deepEqual(
  result.acceptedDeals.map(
    deal =>
      deal.id,
  ),
  [
    "amazon-001",
    "flipkart-001",
  ],
);

assert.deepEqual(
  result.duplicateDeals.map(
    deal =>
      deal.id,
  ),
  [
    "amazon-duplicate-batch",
    "amazon-existing-copy",
  ],
);

assert.equal(
  await repository.count(),
  3,
);

assert.ok(
  await repository.findById(
    "amazon-001",
  ),
);

assert.ok(
  await repository.findById(
    "flipkart-001",
  ),
);

result.acceptedDeals[0].title =
  "External Mutation";

const persistedAmazon =
  await repository.findById(
    "amazon-001",
  );

assert.notEqual(
  persistedAmazon?.title,
  "External Mutation",
);

const dryRunRepository =
  new InMemoryDealRepository();

const dryRunCoordinator =
  new ProviderDiscoveryCoordinator(
    executionEngine,

    new DuplicateDetectionService(
      dryRunRepository,
    ),

    new DiscoveryPersistenceService(
      dryRunRepository,
    ),
  );

const dryRunResult =
  await dryRunCoordinator.runProvider(
    "flipkart",
    {
      runId:
        "run-005c-dry",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,

      persist:
        false,
    },
  );

assert.equal(
  dryRunResult.discovered,
  1,
);

assert.equal(
  dryRunResult.accepted,
  1,
);

assert.equal(
  dryRunResult.inserted,
  0,
);

assert.equal(
  dryRunResult.updated,
  0,
);

assert.equal(
  dryRunResult.skipped,
  0,
);

assert.equal(
  await dryRunRepository.count(),
  0,
);

const secondRun =
  await coordinator.runProvider(
    "amazon",
    {
      runId:
        "run-005c-second",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,

      persist:
        true,
    },
  );

assert.equal(
  secondRun.discovered,
  3,
);

assert.equal(
  secondRun.accepted,
  0,
);

assert.equal(
  secondRun.duplicates,
  3,
);

assert.equal(
  secondRun.inserted,
  0,
);

assert.equal(
  secondRun.updated,
  0,
);

assert.equal(
  secondRun.skipped,
  0,
);

assert.equal(
  await repository.count(),
  3,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      providers:
        result.execution.successfulProviders,

      discovered:
        result.discovered,

      accepted:
        result.accepted,

      duplicates:
        result.duplicates,

      inserted:
        result.inserted,

      dryRunAccepted:
        dryRunResult.accepted,

      finalRepositoryCount:
        await repository.count(),
    },
    null,
    2,
  ),
);
