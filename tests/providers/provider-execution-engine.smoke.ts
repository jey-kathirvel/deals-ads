import assert from "node:assert/strict";

import {
  DealSource,
  DealStatus,
} from "../../lib/database/models";

import type {
  DealRecord,
} from "../../lib/database/models";

import {
  ProviderExecutionEngine,
  ProviderRegistry,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T00:00:05.000Z",
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
      800,

    originalPrice:
      1000,

    discountPercentage:
      20,

    score:
      90,

    discoveredAt:
      startedAt,

    expiresAt:
      new Date(
        "2026-08-01T00:00:00.000Z",
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

const registry =
  new ProviderRegistry();

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
        "flipkart",

      discovered: [
        createDeal(
          "flipkart-001",
          DealSource.FLIPKART,
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
        "amazon",

      name:
        "Amazon",

      enabled:
        true,

      priority:
        2,
    };
  },

  async discover() {
    return {
      providerId:
        "amazon",

      discovered: [
        createDeal(
          "amazon-001",
          DealSource.AMAZON,
        ),

        createDeal(
          "amazon-002",
          DealSource.AMAZON,
        ),
      ],

      durationMs:
        150,
    };
  },
});

registry.register({
  metadata() {
    return {
      id:
        "disabled-provider",

      name:
        "Disabled Provider",

      enabled:
        false,

      priority:
        3,
    };
  },

  async discover() {
    throw new Error(
      "Disabled provider should not execute",
    );
  },
});

registry.register({
  metadata() {
    return {
      id:
        "failing-provider",

      name:
        "Failing Provider",

      enabled:
        true,

      priority:
        4,
    };
  },

  async discover() {
    throw new Error(
      "Provider request failed",
    );
  },
});

const engine =
  new ProviderExecutionEngine(
    registry,
  );

const summary =
  await engine.execute(
    {
      runId:
        "run-005b",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,

      continueOnError:
        true,
    },
  );

assert.equal(
  summary.requestedProviders,
  4,
);

assert.equal(
  summary.executedProviders,
  3,
);

assert.equal(
  summary.skippedProviders,
  1,
);

assert.equal(
  summary.successfulProviders,
  2,
);

assert.equal(
  summary.failedProviders,
  1,
);

assert.equal(
  summary.discoveredDeals,
  3,
);

assert.equal(
  summary.durationMs,
  5000,
);

assert.deepEqual(
  summary.results.map(
    entry =>
      entry.metadata.id,
  ),
  [
    "flipkart",
    "amazon",
  ],
);

assert.deepEqual(
  summary.deals.map(
    deal =>
      deal.id,
  ),
  [
    "flipkart-001",
    "amazon-001",
    "amazon-002",
  ],
);

assert.equal(
  summary.failures[0].providerId,
  "failing-provider",
);

assert.match(
  summary.failures[0].error,
  /Provider request failed/,
);

summary.deals[0].title =
  "External Mutation";

const originalDeal =
  summary.results[0]
    .result
    .discovered[0];

assert.notEqual(
  originalDeal.title,
  "External Mutation",
);

const singleProvider =
  await engine.executeProvider(
    "amazon",
    {
      runId:
        "run-single",

      startedAt,
    },
    {
      now:
        () =>
          completedAt,
    },
  );

assert.equal(
  singleProvider.requestedProviders,
  1,
);

assert.equal(
  singleProvider.successfulProviders,
  1,
);

assert.equal(
  singleProvider.discoveredDeals,
  2,
);

const selectedProviders =
  await engine.execute(
    {
      runId:
        "run-selected",

      startedAt,
    },
    {
      providerIds: [
        "flipkart",
      ],

      now:
        () =>
          completedAt,
    },
  );

assert.equal(
  selectedProviders.requestedProviders,
  1,
);

assert.equal(
  selectedProviders.discoveredDeals,
  1,
);

await assert.rejects(
  engine.executeProvider(
    "unknown-provider",
    {
      runId:
        "run-unknown",

      startedAt,
    },
  ),

  /is not registered/,
);

await assert.rejects(
  engine.execute(
    {
      runId:
        "run-stop-on-error",

      startedAt,
    },
    {
      providerIds: [
        "failing-provider",
      ],

      continueOnError:
        false,
    },
  ),

  /Provider request failed/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      requestedProviders:
        summary.requestedProviders,

      executedProviders:
        summary.executedProviders,

      successfulProviders:
        summary.successfulProviders,

      failedProviders:
        summary.failedProviders,

      skippedProviders:
        summary.skippedProviders,

      discoveredDeals:
        summary.discoveredDeals,

      providerOrder:
        summary.results.map(
          entry =>
            entry.metadata.id,
        ),
    },
    null,
    2,
  ),
);
