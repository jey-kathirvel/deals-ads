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
  createProviderRuntime,
  ProviderHealthStatus,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T03:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T03:00:03.000Z",
  );

function createDeal(
  id: string,
  source: DealSource,
): DealRecord {
  return {
    id,

    externalId:
      `external-${id}`,

    source,

    status:
      DealStatus.DISCOVERED,

    title:
      `Product ${id}`,

    url:
      `https://example.com/${id}`,

    imageUrl:
      `https://images.example.com/${id}.jpg`,

    category:
      "Electronics",

    currency:
      "INR",

    currentPrice:
      750,

    originalPrice:
      1000,

    discountPercentage:
      25,

    score:
      94,

    discoveredAt:
      startedAt,

    expiresAt:
      new Date(
        "2026-08-15T00:00:00.000Z",
      ),

    publishedAt:
      null,

    archivedAt:
      null,

    createdAt:
      startedAt,

    updatedAt:
      startedAt,
  };
}

const repository =
  new InMemoryDealRepository();

const runtime =
  createProviderRuntime(
    new DuplicateDetectionService(
      repository,
    ),

    new DiscoveryPersistenceService(
      repository,
    ),

    {
      healthThresholds: {
        minimumExecutions:
          1,

        degradedFailureRate:
          0.25,

        unhealthyFailureRate:
          0.75,

        degradedConsecutiveFailures:
          1,

        unhealthyConsecutiveFailures:
          3,
      },

      healthDependencies: {
        now:
          () =>
            new Date(
              completedAt.getTime(),
            ),
      },
    },
  );

runtime.runtimeManager.register({
  provider: {
    metadata() {
      return {
        id:
          "amazon-runtime",

        name:
          "Amazon Runtime",

        enabled:
          true,

        priority:
          1,
      };
    },

    async discover(
      context,
    ) {
      assert.ok(
        context.runId.length > 0,
      );

      assert.ok(
        context.startedAt instanceof Date,
      );

      return {
        providerId:
          "amazon-runtime",

        discovered: [
          createDeal(
            "amazon-runtime-001",
            DealSource.AMAZON,
          ),
        ],

        durationMs:
          100,
      };
    },
  },

  retryPolicy: {
    maximumAttempts:
      2,

    retryDelayMs:
      0,

    timeoutMs:
      1000,

    circuitBreakerThreshold:
      3,

    circuitBreakerResetMs:
      60_000,
  },

  dependencies: {
    now:
      () =>
        new Date(
          completedAt.getTime(),
        ),
  },
});

runtime.runtimeManager.register({
  provider: {
    metadata() {
      return {
        id:
          "flipkart-runtime",

        name:
          "Flipkart Runtime",

        enabled:
          true,

        priority:
          2,
      };
    },

    async discover() {
      return {
        providerId:
          "flipkart-runtime",

        discovered: [
          createDeal(
            "flipkart-runtime-001",
            DealSource.FLIPKART,
          ),
        ],

        durationMs:
          125,
      };
    },
  },

  retryPolicy: {
    maximumAttempts:
      1,

    retryDelayMs:
      0,

    timeoutMs:
      1000,

    circuitBreakerThreshold:
      3,

    circuitBreakerResetMs:
      60_000,
  },

  dependencies: {
    now:
      () =>
        new Date(
          completedAt.getTime(),
        ),
  },
});

assert.equal(
  runtime.registry.list().length,
  2,
);

assert.equal(
  runtime.runtimeManager.list().length,
  2,
);

assert.equal(
  runtime.healthMonitor.summary()
    .totalProviders,
  2,
);

const result =
  await runtime.discoveryCoordinator.run(
    {
      runId:
        "runtime-factory-run",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,

      persist:
        true,

      continueOnError:
        true,
    },
  );

assert.equal(
  result.execution.requestedProviders,
  2,
);

assert.equal(
  result.execution.executedProviders,
  2,
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
  2,
);

assert.equal(
  result.accepted,
  2,
);

assert.equal(
  result.duplicates,
  0,
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

assert.equal(
  await repository.count(),
  2,
);

const healthSummary =
  runtime.runtimeManager.healthSummary();

assert.equal(
  healthSummary.totalProviders,
  2,
);

assert.equal(
  healthSummary.healthy,
  2,
);

assert.equal(
  healthSummary.degraded,
  0,
);

assert.equal(
  healthSummary.unhealthy,
  0,
);

assert.equal(
  healthSummary.circuitOpen,
  0,
);

assert.equal(
  healthSummary.unknown,
  0,
);

assert.deepEqual(
  healthSummary.providers.map(
    provider => ({
      id:
        provider.providerId,

      status:
        provider.status,
    }),
  ),
  [
    {
      id:
        "amazon-runtime",

      status:
        ProviderHealthStatus.HEALTHY,
    },

    {
      id:
        "flipkart-runtime",

      status:
        ProviderHealthStatus.HEALTHY,
    },
  ],
);

const amazonSnapshot =
  runtime.runtimeManager.snapshot(
    "amazon-runtime",
  );

assert.ok(
  amazonSnapshot,
);

assert.equal(
  amazonSnapshot.reliability
    .totalExecutions,
  1,
);

assert.equal(
  amazonSnapshot.reliability
    .successfulExecutions,
  1,
);

assert.equal(
  amazonSnapshot.health.status,
  ProviderHealthStatus.HEALTHY,
);

const duplicateRun =
  await runtime.discoveryCoordinator.run(
    {
      runId:
        "runtime-factory-run-second",

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
  duplicateRun.discovered,
  2,
);

assert.equal(
  duplicateRun.accepted,
  0,
);

assert.equal(
  duplicateRun.duplicates,
  2,
);

assert.equal(
  duplicateRun.inserted,
  0,
);

assert.equal(
  await repository.count(),
  2,
);

const dryRunRepository =
  new InMemoryDealRepository();

const dryRuntime =
  createProviderRuntime(
    new DuplicateDetectionService(
      dryRunRepository,
    ),

    new DiscoveryPersistenceService(
      dryRunRepository,
    ),
  );

dryRuntime.runtimeManager.register({
  provider: {
    metadata() {
      return {
        id:
          "dry-runtime",

        name:
          "Dry Runtime",

        enabled:
          true,

        priority:
          1,
      };
    },

    async discover() {
      return {
        providerId:
          "dry-runtime",

        discovered: [
          createDeal(
            "dry-runtime-001",
            DealSource.AMAZON,
          ),
        ],

        durationMs:
          20,
      };
    },
  },

  retryPolicy: {
    maximumAttempts:
      1,

    retryDelayMs:
      0,

    timeoutMs:
      1000,
  },
});

const dryResult =
  await dryRuntime.discoveryCoordinator.run(
    {
      runId:
        "dry-runtime-run",

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
  dryResult.discovered,
  1,
);

assert.equal(
  dryResult.accepted,
  1,
);

assert.equal(
  dryResult.inserted,
  0,
);

assert.equal(
  await dryRunRepository.count(),
  0,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredProviders:
        runtime.runtimeManager
          .list()
          .map(
            provider =>
              provider.metadata().id,
          ),

      discovered:
        result.discovered,

      accepted:
        result.accepted,

      inserted:
        result.inserted,

      healthyProviders:
        healthSummary.healthy,

      duplicateRunDuplicates:
        duplicateRun.duplicates,

      repositoryCount:
        await repository.count(),

      dryRunRepositoryCount:
        await dryRunRepository.count(),
    },
    null,
    2,
  ),
);
