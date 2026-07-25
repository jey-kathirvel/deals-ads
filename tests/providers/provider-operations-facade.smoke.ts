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
  ProviderControlPlane,
  ProviderHealthStatus,
  ProviderOperationsFacade,
  ProviderRunHistoryService,
  ProviderRunStatus,
} from "../../lib/providers";

const firstStartedAt =
  new Date(
    "2026-07-25T08:00:00.000Z",
  );

const firstCompletedAt =
  new Date(
    "2026-07-25T08:00:03.000Z",
  );

const secondStartedAt =
  new Date(
    "2026-07-25T09:00:00.000Z",
  );

const secondCompletedAt =
  new Date(
    "2026-07-25T09:00:02.000Z",
  );

const dashboardTime =
  new Date(
    "2026-07-25T10:00:00.000Z",
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
      600,

    originalPrice:
      1000,

    discountPercentage:
      40,

    score:
      98,

    discoveredAt:
      firstStartedAt,

    expiresAt:
      new Date(
        "2026-08-30T00:00:00.000Z",
      ),

    publishedAt:
      null,

    archivedAt:
      null,

    createdAt:
      firstStartedAt,

    updatedAt:
      firstStartedAt,
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
              dashboardTime.getTime(),
            ),
      },
    },
  );

const controlPlane =
  new ProviderControlPlane(
    runtime.runtimeManager,
    runtime.discoveryCoordinator,
    {
      now:
        () =>
          new Date(
            dashboardTime.getTime(),
          ),
    },
  );

const history =
  new ProviderRunHistoryService(
    runtime.discoveryCoordinator,
    {
      now:
        () =>
          new Date(
            dashboardTime.getTime(),
          ),
    },
  );

const operations =
  new ProviderOperationsFacade(
    controlPlane,
    history,
    {
      now:
        () =>
          new Date(
            dashboardTime.getTime(),
          ),

      recentRunLimit:
        5,
    },
  );

operations.registerMany([
  {
    provider: {
      metadata() {
        return {
          id:
            "amazon-operations",

          name:
            "Amazon Operations",

          enabled:
            true,

          priority:
            1,
        };
      },

      async discover() {
        return {
          providerId:
            "amazon-operations",

          discovered: [
            createDeal(
              "amazon-operations-001",
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
  },

  {
    provider: {
      metadata() {
        return {
          id:
            "flipkart-operations",

          name:
            "Flipkart Operations",

          enabled:
            true,

          priority:
            2,
        };
      },

      async discover() {
        return {
          providerId:
            "flipkart-operations",

          discovered: [
            createDeal(
              "flipkart-operations-001",
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
  },
]);

const allRun =
  await operations.discoverAll(
    {
      runId:
        "operations-all",

      startedAt:
        firstStartedAt,
    },
    {
      now:
        () =>
          firstCompletedAt,

      persist:
        true,

      continueOnError:
        true,
    },
  );

assert.equal(
  allRun.execution.requestedProviders,
  2,
);

assert.equal(
  allRun.execution.successfulProviders,
  2,
);

assert.equal(
  allRun.discovered,
  2,
);

assert.equal(
  allRun.inserted,
  2,
);

assert.equal(
  await repository.count(),
  2,
);

const allRunRecord =
  operations.run(
    "operations-all",
  );

assert.ok(
  allRunRecord,
);

assert.equal(
  allRunRecord.status,
  ProviderRunStatus.SUCCEEDED,
);

assert.equal(
  allRunRecord.durationMs,
  3000,
);

assert.equal(
  allRunRecord.insertedDeals,
  2,
);

const singleRun =
  await operations.discoverProvider(
    "amazon-operations",
    {
      runId:
        "operations-single",

      startedAt:
        secondStartedAt,
    },
    {
      now:
        () =>
          secondCompletedAt,

      persist:
        false,
    },
  );

assert.equal(
  singleRun.execution.requestedProviders,
  1,
);

assert.equal(
  singleRun.execution.successfulProviders,
  1,
);

assert.equal(
  singleRun.discovered,
  1,
);

assert.equal(
  singleRun.duplicates,
  1,
);

assert.equal(
  singleRun.inserted,
  0,
);

const singleRunRecord =
  operations.run(
    "operations-single",
  );

assert.ok(
  singleRunRecord,
);

assert.equal(
  singleRunRecord.status,
  ProviderRunStatus.SUCCEEDED,
);

assert.equal(
  singleRunRecord.requestedProviders,
  1,
);

assert.equal(
  singleRunRecord.duplicateDeals,
  1,
);

await assert.rejects(
  operations.discoverProvider(
    "missing-operations",
    {
      runId:
        "operations-missing",

      startedAt:
        secondStartedAt,
    },
  ),

  /not registered in the operations facade/,
);

assert.equal(
  operations.run(
    "operations-missing",
  ),
  null,
);

const amazonProvider =
  operations.provider(
    "amazon-operations",
  );

assert.ok(
  amazonProvider,
);

assert.equal(
  amazonProvider.health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  amazonProvider.reliability
    .successfulExecutions,
  2,
);

assert.equal(
  operations.provider(
    "missing-operations",
  ),
  null,
);

const latest =
  operations.latestRun();

assert.ok(
  latest,
);

assert.equal(
  latest.runId,
  "operations-single",
);

const historyResult =
  operations.history();

assert.equal(
  historyResult.total,
  2,
);

assert.deepEqual(
  historyResult.records.map(
    record =>
      record.runId,
  ),
  [
    "operations-single",
    "operations-all",
  ],
);

const filteredHistory =
  operations.history({
    status:
      ProviderRunStatus.SUCCEEDED,

    limit:
      1,

    offset:
      0,
  });

assert.equal(
  filteredHistory.total,
  2,
);

assert.equal(
  filteredHistory.records.length,
  1,
);

assert.equal(
  filteredHistory.records[0].runId,
  "operations-single",
);

const dashboard =
  operations.dashboard();

assert.equal(
  dashboard.generatedAt.toISOString(),
  dashboardTime.toISOString(),
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
  dashboard.overview.health.healthy,
  2,
);

assert.ok(
  dashboard.latestRun,
);

assert.equal(
  dashboard.latestRun.runId,
  "operations-single",
);

assert.equal(
  dashboard.recentRuns.total,
  2,
);

assert.equal(
  dashboard.recentRuns.limit,
  5,
);

assert.deepEqual(
  dashboard.recentRuns.records.map(
    record =>
      record.runId,
  ),
  [
    "operations-single",
    "operations-all",
  ],
);

dashboard.generatedAt.setUTCFullYear(
  2035,
);

dashboard.recentRuns.records[0]
  .runId =
    "external-mutation";

const immutableDashboard =
  operations.dashboard();

assert.equal(
  immutableDashboard.generatedAt
    .getUTCFullYear(),
  2026,
);

assert.equal(
  immutableDashboard
    .recentRuns
    .records[0]
    .runId,
  "operations-single",
);

assert.throws(
  () =>
    new ProviderOperationsFacade(
      controlPlane,
      history,
      {
        recentRunLimit:
          0,
      },
    ),

  /recentRunLimit must be an integer/,
);

assert.throws(
  () =>
    new ProviderOperationsFacade(
      controlPlane,
      history,
      {
        recentRunLimit:
          501,
      },
    ),

  /recentRunLimit must be an integer/,
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
        dashboard.recentRuns
          .total,

      latestRun:
        dashboard.latestRun
          .runId,

      insertedDeals:
        allRun.inserted,

      duplicateDeals:
        singleRun.duplicates,

      repositoryCount:
        await repository.count(),
    },
    null,
    2,
  ),
);
