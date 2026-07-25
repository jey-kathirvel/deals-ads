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
  createProviderOperationsRuntime,
  ProviderHealthStatus,
  ProviderRunStatus,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T11:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T11:00:05.000Z",
  );

const generatedAt =
  new Date(
    "2026-07-25T12:00:00.000Z",
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
      550,

    originalPrice:
      1000,

    discountPercentage:
      45,

    score:
      99,

    discoveredAt:
      startedAt,

    expiresAt:
      new Date(
        "2026-09-01T00:00:00.000Z",
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
  createProviderOperationsRuntime(
    new DuplicateDetectionService(
      repository,
    ),

    new DiscoveryPersistenceService(
      repository,
    ),

    {
      runtime: {
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
                generatedAt.getTime(),
              ),
        },
      },

      controlPlane: {
        now:
          () =>
            new Date(
              generatedAt.getTime(),
            ),
      },

      runHistory: {
        now:
          () =>
            new Date(
              generatedAt.getTime(),
            ),
      },

      operations: {
        now:
          () =>
            new Date(
              generatedAt.getTime(),
            ),

        recentRunLimit:
          3,
      },
    },
  );

runtime.operations.registerMany([
  {
    provider: {
      metadata() {
        return {
          id:
            "amazon-factory",

          name:
            "Amazon Factory",

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
            "amazon-factory",

          discovered: [
            createDeal(
              "amazon-factory-001",
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
  },

  {
    provider: {
      metadata() {
        return {
          id:
            "flipkart-factory",

          name:
            "Flipkart Factory",

          enabled:
            true,

          priority:
            2,
        };
      },

      async discover() {
        return {
          providerId:
            "flipkart-factory",

          discovered: [
            createDeal(
              "flipkart-factory-001",
              DealSource.FLIPKART,
            ),
          ],

          durationMs:
            120,
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
  },
]);

assert.equal(
  runtime.registry.list().length,
  2,
);

assert.equal(
  runtime.runtimeManager.list().length,
  2,
);

assert.equal(
  runtime.controlPlane
    .overview()
    .registeredProviders,
  2,
);

assert.equal(
  runtime.runHistory.count(),
  0,
);

const result =
  await runtime.operations.discoverAll(
    {
      runId:
        "operations-runtime-factory-run",

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
  await repository.count(),
  2,
);

const historyRecord =
  runtime.operations.run(
    "operations-runtime-factory-run",
  );

assert.ok(
  historyRecord,
);

assert.equal(
  historyRecord.status,
  ProviderRunStatus.SUCCEEDED,
);

assert.equal(
  historyRecord.durationMs,
  5000,
);

assert.equal(
  historyRecord.requestedProviders,
  2,
);

assert.equal(
  historyRecord.successfulProviders,
  2,
);

assert.equal(
  historyRecord.insertedDeals,
  2,
);

const dashboard =
  runtime.operations.dashboard();

assert.equal(
  dashboard.generatedAt.toISOString(),
  generatedAt.toISOString(),
);

assert.equal(
  dashboard.overview.registeredProviders,
  2,
);

assert.equal(
  dashboard.overview.enabledProviders,
  2,
);

assert.equal(
  dashboard.overview.disabledProviders,
  0,
);

assert.equal(
  dashboard.overview.health.healthy,
  2,
);

assert.equal(
  dashboard.overview.health.unknown,
  0,
);

assert.ok(
  dashboard.latestRun,
);

assert.equal(
  dashboard.latestRun.runId,
  "operations-runtime-factory-run",
);

assert.equal(
  dashboard.recentRuns.total,
  1,
);

assert.equal(
  dashboard.recentRuns.limit,
  3,
);

assert.equal(
  dashboard.recentRuns.records[0]
    .status,
  ProviderRunStatus.SUCCEEDED,
);

const amazon =
  runtime.operations.provider(
    "amazon-factory",
  );

assert.ok(
  amazon,
);

assert.equal(
  amazon.health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  amazon.reliability
    .totalExecutions,
  1,
);

assert.equal(
  amazon.reliability
    .successfulExecutions,
  1,
);

const duplicateResult =
  await runtime.operations.discoverProvider(
    "amazon-factory",
    {
      runId:
        "operations-runtime-factory-duplicate",

      startedAt:
        new Date(
          "2026-07-25T13:00:00.000Z",
        ),
    },
    {
      now:
        () =>
          new Date(
            "2026-07-25T13:00:02.000Z",
          ),

      persist:
        true,
    },
  );

assert.equal(
  duplicateResult.execution
    .requestedProviders,
  1,
);

assert.equal(
  duplicateResult.discovered,
  1,
);

assert.equal(
  duplicateResult.accepted,
  0,
);

assert.equal(
  duplicateResult.duplicates,
  1,
);

assert.equal(
  duplicateResult.inserted,
  0,
);

assert.equal(
  await repository.count(),
  2,
);

assert.equal(
  runtime.runHistory.count(),
  2,
);

assert.equal(
  runtime.operations
    .latestRun()
    ?.runId,
  "operations-runtime-factory-duplicate",
);

assert.equal(
  runtime.executionEngine,
  runtime.executionEngine,
);

assert.equal(
  runtime.discoveryCoordinator,
  runtime.discoveryCoordinator,
);

assert.equal(
  runtime.healthMonitor,
  runtime.healthMonitor,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredProviders:
        dashboard.overview
          .registeredProviders,

      healthyProviders:
        dashboard.overview
          .health
          .healthy,

      totalRuns:
        runtime.runHistory.count(),

      insertedDeals:
        result.inserted,

      duplicateDeals:
        duplicateResult.duplicates,

      repositoryCount:
        await repository.count(),
    },
    null,
    2,
  ),
);
