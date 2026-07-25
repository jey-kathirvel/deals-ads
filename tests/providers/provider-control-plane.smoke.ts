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
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T04:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T04:00:04.000Z",
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
      700,

    originalPrice:
      1000,

    discountPercentage:
      30,

    score:
      96,

    discoveredAt:
      startedAt,

    expiresAt:
      new Date(
        "2026-08-20T00:00:00.000Z",
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

const controlPlane =
  new ProviderControlPlane(
    runtime.runtimeManager,
    runtime.discoveryCoordinator,
    {
      now:
        () =>
          new Date(
            completedAt.getTime(),
          ),
    },
  );

controlPlane.registerMany([
  {
    provider: {
      metadata() {
        return {
          id:
            "amazon-control",

          name:
            "Amazon Control",

          enabled:
            true,

          priority:
            1,
        };
      },

      async discover() {
        return {
          providerId:
            "amazon-control",

          discovered: [
            createDeal(
              "amazon-control-001",
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
            "flipkart-control",

          name:
            "Flipkart Control",

          enabled:
            true,

          priority:
            2,
        };
      },

      async discover() {
        return {
          providerId:
            "flipkart-control",

          discovered: [
            createDeal(
              "flipkart-control-001",
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

controlPlane.register({
  provider: {
    metadata() {
      return {
        id:
          "disabled-control",

        name:
          "Disabled Control",

        enabled:
          false,

        priority:
          3,
      };
    },

    async discover() {
      throw new Error(
        "Disabled provider must not execute",
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
  },
});

const initialOverview =
  controlPlane.overview();

assert.equal(
  initialOverview.registeredProviders,
  3,
);

assert.equal(
  initialOverview.enabledProviders,
  2,
);

assert.equal(
  initialOverview.disabledProviders,
  1,
);

assert.equal(
  initialOverview.health.unknown,
  3,
);

assert.deepEqual(
  initialOverview.providers.map(
    provider =>
      provider.providerId,
  ),
  [
    "amazon-control",
    "flipkart-control",
    "disabled-control",
  ],
);

const discovery =
  await controlPlane.discoverAll(
    {
      runId:
        "control-plane-run",

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
  discovery.execution.requestedProviders,
  3,
);

assert.equal(
  discovery.execution.executedProviders,
  2,
);

assert.equal(
  discovery.execution.skippedProviders,
  1,
);

assert.equal(
  discovery.execution.successfulProviders,
  2,
);

assert.equal(
  discovery.discovered,
  2,
);

assert.equal(
  discovery.accepted,
  2,
);

assert.equal(
  discovery.inserted,
  2,
);

assert.equal(
  await repository.count(),
  2,
);

const activeOverview =
  controlPlane.overview();

assert.equal(
  activeOverview.health.healthy,
  2,
);

assert.equal(
  activeOverview.health.unknown,
  1,
);

assert.equal(
  activeOverview.providers[0]
    .health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  activeOverview.providers[1]
    .health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  activeOverview.providers[2]
    .health.status,
  ProviderHealthStatus.UNKNOWN,
);

const amazonSnapshot =
  controlPlane.provider(
    "amazon-control",
  );

assert.ok(
  amazonSnapshot,
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

assert.equal(
  controlPlane.provider(
    "missing-control",
  ),
  null,
);

const singleProviderRun =
  await controlPlane.discoverProvider(
    "amazon-control",
    {
      runId:
        "control-plane-single",

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
  singleProviderRun.execution
    .requestedProviders,
  1,
);

assert.equal(
  singleProviderRun.execution
    .successfulProviders,
  1,
);

assert.equal(
  singleProviderRun.discovered,
  1,
);

assert.equal(
  singleProviderRun.duplicates,
  1,
);

assert.equal(
  singleProviderRun.inserted,
  0,
);

await assert.rejects(
  controlPlane.discoverProvider(
    "missing-control",
    {
      runId:
        "control-plane-missing",

      startedAt,
    },
  ),

  /not registered in the control plane/,
);

assert.throws(
  () =>
    controlPlane.resetCircuit(
      "missing-control",
    ),

  /not registered in the control plane/,
);

activeOverview.providers[0]
  .providerName =
    "External Mutation";

activeOverview.providers[0]
  .reliability
  .successfulExecutions =
    999;

activeOverview.health.providers[0]
  .providerName =
    "External Health Mutation";

const immutableOverview =
  controlPlane.overview();

assert.notEqual(
  immutableOverview.providers[0]
    .providerName,
  "External Mutation",
);

assert.notEqual(
  immutableOverview.providers[0]
    .reliability
    .successfulExecutions,
  999,
);

assert.notEqual(
  immutableOverview.health
    .providers[0]
    .providerName,
  "External Health Mutation",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredProviders:
        activeOverview
          .registeredProviders,

      enabledProviders:
        activeOverview
          .enabledProviders,

      disabledProviders:
        activeOverview
          .disabledProviders,

      executedProviders:
        discovery.execution
          .executedProviders,

      skippedProviders:
        discovery.execution
          .skippedProviders,

      discovered:
        discovery.discovered,

      inserted:
        discovery.inserted,

      healthyProviders:
        activeOverview.health
          .healthy,

      unknownProviders:
        activeOverview.health
          .unknown,

      repositoryCount:
        await repository.count(),
    },
    null,
    2,
  ),
);
