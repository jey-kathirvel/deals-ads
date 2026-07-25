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
  bootstrapProviderOperations,
  ProviderHealthStatus,
  ProviderRunStatus,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T14:00:00.000Z",
  );

const completedAt =
  new Date(
    "2026-07-25T14:00:04.000Z",
  );

const generatedAt =
  new Date(
    "2026-07-25T15:00:00.000Z",
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
      500,

    originalPrice:
      1000,

    discountPercentage:
      50,

    score:
      99,

    discoveredAt:
      startedAt,

    expiresAt:
      new Date(
        "2026-09-10T00:00:00.000Z",
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

const bootstrap =
  bootstrapProviderOperations(
    new DuplicateDetectionService(
      repository,
    ),

    new DiscoveryPersistenceService(
      repository,
    ),

    {
      requireProviders:
        true,

      runtime: {
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
            5,
        },
      },

      providers: [
        {
          provider: {
            metadata() {
              return {
                id:
                  "amazon-bootstrap",

                name:
                  "Amazon Bootstrap",

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
                context.startedAt
                  instanceof Date,
              );

              return {
                providerId:
                  "amazon-bootstrap",

                discovered: [
                  createDeal(
                    "amazon-bootstrap-001",
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
                  "flipkart-bootstrap",

                name:
                  "Flipkart Bootstrap",

                enabled:
                  true,

                priority:
                  2,
              };
            },

            async discover() {
              return {
                providerId:
                  "flipkart-bootstrap",

                discovered: [
                  createDeal(
                    "flipkart-bootstrap-001",
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
        },
      ],
    },
  );

assert.equal(
  bootstrap.registeredProviders,
  2,
);

assert.deepEqual(
  bootstrap.registeredProviderIds,
  [
    "amazon-bootstrap",
    "flipkart-bootstrap",
  ],
);

assert.equal(
  bootstrap.runtime
    .registry
    .list()
    .length,
  2,
);

assert.equal(
  bootstrap.runtime
    .runtimeManager
    .list()
    .length,
  2,
);

assert.equal(
  bootstrap.runtime
    .runHistory
    .count(),
  0,
);

const discovery =
  await bootstrap.runtime
    .operations
    .discoverAll(
      {
        runId:
          "bootstrap-run",

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
  discovery.execution
    .requestedProviders,
  2,
);

assert.equal(
  discovery.execution
    .executedProviders,
  2,
);

assert.equal(
  discovery.execution
    .successfulProviders,
  2,
);

assert.equal(
  discovery.execution
    .failedProviders,
  0,
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
  discovery.duplicates,
  0,
);

assert.equal(
  discovery.inserted,
  2,
);

assert.equal(
  await repository.count(),
  2,
);

const historyRecord =
  bootstrap.runtime
    .operations
    .run(
      "bootstrap-run",
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
  4000,
);

assert.equal(
  historyRecord.insertedDeals,
  2,
);

const dashboard =
  bootstrap.runtime
    .operations
    .dashboard();

assert.equal(
  dashboard.generatedAt
    .toISOString(),
  generatedAt.toISOString(),
);

assert.equal(
  dashboard.overview
    .registeredProviders,
  2,
);

assert.equal(
  dashboard.overview
    .enabledProviders,
  2,
);

assert.equal(
  dashboard.overview
    .health
    .healthy,
  2,
);

assert.equal(
  dashboard.recentRuns.total,
  1,
);

assert.ok(
  dashboard.latestRun,
);

assert.equal(
  dashboard.latestRun.runId,
  "bootstrap-run",
);

const amazonSnapshot =
  bootstrap.runtime
    .operations
    .provider(
      "amazon-bootstrap",
    );

assert.ok(
  amazonSnapshot,
);

assert.equal(
  amazonSnapshot.health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  amazonSnapshot
    .reliability
    .successfulExecutions,
  1,
);

const emptyRepository =
  new InMemoryDealRepository();

const emptyBootstrap =
  bootstrapProviderOperations(
    new DuplicateDetectionService(
      emptyRepository,
    ),

    new DiscoveryPersistenceService(
      emptyRepository,
    ),
  );

assert.equal(
  emptyBootstrap.registeredProviders,
  0,
);

assert.deepEqual(
  emptyBootstrap.registeredProviderIds,
  [],
);

assert.equal(
  emptyBootstrap.runtime
    .operations
    .dashboard()
    .overview
    .registeredProviders,
  0,
);

assert.throws(
  () =>
    bootstrapProviderOperations(
      new DuplicateDetectionService(
        new InMemoryDealRepository(),
      ),

      new DiscoveryPersistenceService(
        new InMemoryDealRepository(),
      ),

      {
        requireProviders:
          true,

        providers:
          [],
      },
    ),

  /At least one provider registration is required/,
);

assert.throws(
  () =>
    bootstrapProviderOperations(
      new DuplicateDetectionService(
        new InMemoryDealRepository(),
      ),

      new DiscoveryPersistenceService(
        new InMemoryDealRepository(),
      ),

      {
        providers: [
          {
            provider: {
              metadata() {
                return {
                  id:
                    "duplicate-bootstrap",

                  name:
                    "Duplicate Bootstrap One",

                  enabled:
                    true,

                  priority:
                    1,
                };
              },

              async discover() {
                return {
                  providerId:
                    "duplicate-bootstrap",

                  discovered:
                    [],

                  durationMs:
                    1,
                };
              },
            },
          },

          {
            provider: {
              metadata() {
                return {
                  id:
                    "duplicate-bootstrap",

                  name:
                    "Duplicate Bootstrap Two",

                  enabled:
                    true,

                  priority:
                    2,
                };
              },

              async discover() {
                return {
                  providerId:
                    "duplicate-bootstrap",

                  discovered:
                    [],

                  durationMs:
                    1,
                };
              },
            },
          },
        ],
      },
    ),

  /Duplicate provider registration/,
);

assert.throws(
  () =>
    bootstrapProviderOperations(
      new DuplicateDetectionService(
        new InMemoryDealRepository(),
      ),

      new DiscoveryPersistenceService(
        new InMemoryDealRepository(),
      ),

      {
        providers: [
          {
            provider: {
              metadata() {
                return {
                  id:
                    "   ",

                  name:
                    "Invalid Provider",

                  enabled:
                    true,

                  priority:
                    1,
                };
              },

              async discover() {
                return {
                  providerId:
                    "invalid-provider",

                  discovered:
                    [],

                  durationMs:
                    1,
                };
              },
            },
          },
        ],
      },
    ),

  /Provider ID must not be empty/,
);

assert.throws(
  () =>
    bootstrapProviderOperations(
      new DuplicateDetectionService(
        new InMemoryDealRepository(),
      ),

      new DiscoveryPersistenceService(
        new InMemoryDealRepository(),
      ),

      {
        providers: [
          {
            provider: {
              metadata() {
                return {
                  id:
                    "invalid-name",

                  name:
                    "   ",

                  enabled:
                    true,

                  priority:
                    1,
                };
              },

              async discover() {
                return {
                  providerId:
                    "invalid-name",

                  discovered:
                    [],

                  durationMs:
                    1,
                };
              },
            },
          },
        ],
      },
    ),

  /name must not be empty/,
);

assert.throws(
  () =>
    bootstrapProviderOperations(
      new DuplicateDetectionService(
        new InMemoryDealRepository(),
      ),

      new DiscoveryPersistenceService(
        new InMemoryDealRepository(),
      ),

      {
        providers: [
          {
            provider: {
              metadata() {
                return {
                  id:
                    "invalid-priority",

                  name:
                    "Invalid Priority",

                  enabled:
                    true,

                  priority:
                    Number.NaN,
                };
              },

              async discover() {
                return {
                  providerId:
                    "invalid-priority",

                  discovered:
                    [],

                  durationMs:
                    1,
                };
              },
            },
          },
        ],
      },
    ),

  /priority must be a finite number/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredProviders:
        bootstrap.registeredProviders,

      registeredProviderIds:
        bootstrap.registeredProviderIds,

      discoveredDeals:
        discovery.discovered,

      insertedDeals:
        discovery.inserted,

      healthyProviders:
        dashboard.overview
          .health
          .healthy,

      runStatus:
        historyRecord.status,

      repositoryCount:
        await repository.count(),

      emptyRuntimeProviders:
        emptyBootstrap
          .registeredProviders,
    },
    null,
    2,
  ),
);
