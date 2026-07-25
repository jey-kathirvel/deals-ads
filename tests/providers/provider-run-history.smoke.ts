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
  ProviderRunHistoryService,
  ProviderRunStatus,
} from "../../lib/providers";

const firstStartedAt =
  new Date(
    "2026-07-25T05:00:00.000Z",
  );

const firstCompletedAt =
  new Date(
    "2026-07-25T05:00:03.000Z",
  );

const secondStartedAt =
  new Date(
    "2026-07-25T06:00:00.000Z",
  );

const secondCompletedAt =
  new Date(
    "2026-07-25T06:00:04.000Z",
  );

let failureCompletedAt =
  new Date(
    "2026-07-25T07:00:02.000Z",
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
      650,

    originalPrice:
      1000,

    discountPercentage:
      35,

    score:
      97,

    discoveredAt:
      firstStartedAt,

    expiresAt:
      new Date(
        "2026-08-25T00:00:00.000Z",
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
  );

runtime.runtimeManager.register({
  provider: {
    metadata() {
      return {
        id:
          "successful-history",

        name:
          "Successful History",

        enabled:
          true,

        priority:
          1,
      };
    },

    async discover() {
      return {
        providerId:
          "successful-history",

        discovered: [
          createDeal(
            "successful-history-001",
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
});

runtime.runtimeManager.register({
  provider: {
    metadata() {
      return {
        id:
          "failing-history",

        name:
          "Failing History",

        enabled:
          true,

        priority:
          2,
      };
    },

    async discover() {
      throw new Error(
        "History provider failure",
      );
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
      10,

    circuitBreakerResetMs:
      60_000,
  },
});

const history =
  new ProviderRunHistoryService(
    runtime.discoveryCoordinator,
    {
      now:
        () =>
          new Date(
            failureCompletedAt.getTime(),
          ),
    },
  );

const successfulRun =
  await history.execute(
    {
      runId:
        "history-success",

      startedAt:
        firstStartedAt,
    },
    {
      providerIds: [
        "successful-history",
      ],

      now:
        () =>
          firstCompletedAt,

      persist:
        true,
    },
  );

assert.equal(
  successfulRun.inserted,
  1,
);

const successfulRecord =
  history.get(
    "history-success",
  );

assert.ok(
  successfulRecord,
);

assert.equal(
  successfulRecord.status,
  ProviderRunStatus.SUCCEEDED,
);

assert.equal(
  successfulRecord.durationMs,
  3000,
);

assert.equal(
  successfulRecord.requestedProviders,
  1,
);

assert.equal(
  successfulRecord.successfulProviders,
  1,
);

assert.equal(
  successfulRecord.failedProviders,
  0,
);

assert.equal(
  successfulRecord.discoveredDeals,
  1,
);

assert.equal(
  successfulRecord.acceptedDeals,
  1,
);

assert.equal(
  successfulRecord.insertedDeals,
  1,
);

assert.deepEqual(
  successfulRecord.failureMessages,
  [],
);

const partialRun =
  await history.execute(
    {
      runId:
        "history-partial",

      startedAt:
        secondStartedAt,
    },
    {
      now:
        () =>
          secondCompletedAt,

      persist:
        false,

      continueOnError:
        true,
    },
  );

assert.equal(
  partialRun.execution.successfulProviders,
  1,
);

assert.equal(
  partialRun.execution.failedProviders,
  1,
);

const partialRecord =
  history.get(
    "history-partial",
  );

assert.ok(
  partialRecord,
);

assert.equal(
  partialRecord.status,
  ProviderRunStatus.PARTIAL,
);

assert.equal(
  partialRecord.durationMs,
  4000,
);

assert.equal(
  partialRecord.requestedProviders,
  2,
);

assert.equal(
  partialRecord.executedProviders,
  2,
);

assert.equal(
  partialRecord.successfulProviders,
  1,
);

assert.equal(
  partialRecord.failedProviders,
  1,
);

assert.equal(
  partialRecord.discoveredDeals,
  1,
);

assert.equal(
  partialRecord.duplicateDeals,
  1,
);

assert.equal(
  partialRecord.insertedDeals,
  0,
);

assert.equal(
  partialRecord.failureMessages.length,
  1,
);

assert.match(
  partialRecord.failureMessages[0],
  /failing-history: History provider failure/,
);

const failureStartedAt =
  new Date(
    "2026-07-25T07:00:00.000Z",
  );

await assert.rejects(
  history.execute(
    {
      runId:
        "history-failure",

      startedAt:
        failureStartedAt,
    },
    {
      providerIds: [
        "failing-history",
      ],

      continueOnError:
        false,
    },
  ),

  /History provider failure/,
);

const failureRecord =
  history.get(
    "history-failure",
  );

assert.ok(
  failureRecord,
);

assert.equal(
  failureRecord.status,
  ProviderRunStatus.FAILED,
);

assert.equal(
  failureRecord.durationMs,
  2000,
);

assert.equal(
  failureRecord.failureMessages.length,
  1,
);

assert.match(
  failureRecord.failureMessages[0],
  /History provider failure/,
);

assert.equal(
  history.count(),
  3,
);

assert.equal(
  history.count(
    ProviderRunStatus.SUCCEEDED,
  ),
  1,
);

assert.equal(
  history.count(
    ProviderRunStatus.PARTIAL,
  ),
  1,
);

assert.equal(
  history.count(
    ProviderRunStatus.FAILED,
  ),
  1,
);

assert.equal(
  history.count(
    ProviderRunStatus.RUNNING,
  ),
  0,
);

const latest =
  history.latest();

assert.ok(
  latest,
);

assert.equal(
  latest.runId,
  "history-failure",
);

const allRuns =
  history.list();

assert.equal(
  allRuns.total,
  3,
);

assert.deepEqual(
  allRuns.records.map(
    record =>
      record.runId,
  ),
  [
    "history-failure",
    "history-partial",
    "history-success",
  ],
);

const partialRuns =
  history.list({
    status:
      ProviderRunStatus.PARTIAL,

    limit:
      10,

    offset:
      0,
  });

assert.equal(
  partialRuns.total,
  1,
);

assert.equal(
  partialRuns.records[0].runId,
  "history-partial",
);

const paginated =
  history.list({
    limit:
      1,

    offset:
      1,
  });

assert.equal(
  paginated.total,
  3,
);

assert.equal(
  paginated.records.length,
  1,
);

assert.equal(
  paginated.records[0].runId,
  "history-partial",
);

allRuns.records[0]
  .failureMessages[0] =
    "External Mutation";

allRuns.records[0]
  .startedAt.setUTCFullYear(
    2035,
  );

const immutableFailure =
  history.get(
    "history-failure",
  );

assert.ok(
  immutableFailure,
);

assert.notEqual(
  immutableFailure.failureMessages[0],
  "External Mutation",
);

assert.equal(
  immutableFailure.startedAt
    .getUTCFullYear(),
  2026,
);

await assert.rejects(
  history.execute(
    {
      runId:
        "history-success",

      startedAt:
        firstStartedAt,
    },
  ),

  /already exists/,
);

assert.throws(
  () =>
    history.list({
      limit:
        0,
    }),

  /limit must be an integer/,
);

assert.throws(
  () =>
    history.list({
      limit:
        501,
    }),

  /limit must be an integer/,
);

assert.throws(
  () =>
    history.list({
      offset:
        -1,
    }),

  /offset must be a non-negative integer/,
);

assert.equal(
  history.get(
    "missing-history",
  ),
  null,
);

history.clear();

assert.equal(
  history.count(),
  0,
);

assert.equal(
  history.latest(),
  null,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      successfulStatus:
        successfulRecord.status,

      partialStatus:
        partialRecord.status,

      failedStatus:
        failureRecord.status,

      totalRunsBeforeClear:
        allRuns.total,

      latestRun:
        latest.runId,

      repositoryCount:
        await repository.count(),

      totalRunsAfterClear:
        history.count(),
    },
    null,
    2,
  ),
);
