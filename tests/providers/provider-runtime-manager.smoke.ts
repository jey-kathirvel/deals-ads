import assert from "node:assert/strict";

import {
  ProviderCircuitOpenError,
  ProviderHealthMonitor,
  ProviderHealthStatus,
  ProviderRegistry,
  ProviderRuntimeManager,
} from "../../lib/providers";

import type {
  DealProvider,
} from "../../lib/providers";

const startedAt =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

let currentTime =
  new Date(
    "2026-07-25T02:00:00.000Z",
  );

function createProvider(
  id: string,
  priority: number,
  discover:
    DealProvider["discover"],
): DealProvider {
  return {
    metadata() {
      return {
        id,

        name:
          `Provider ${id}`,

        enabled:
          true,

        priority,
      };
    },

    discover,
  };
}

const registry =
  new ProviderRegistry();

const healthMonitor =
  new ProviderHealthMonitor(
    {
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
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

const manager =
  new ProviderRuntimeManager(
    registry,
    healthMonitor,
  );

let healthyCalls = 0;

const healthyProvider =
  manager.register({
    provider:
      createProvider(
        "healthy-runtime",
        1,
        async context => {
          healthyCalls++;

          assert.equal(
            context.runId,
            "healthy-runtime-run",
          );

          return {
            providerId:
              "healthy-runtime",

            discovered:
              [],

            durationMs:
              10,
          };
        },
      ),

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
            currentTime.getTime(),
          ),
    },
  });

let failingCalls = 0;

const [
  failingProvider,
  unknownProvider,
] =
  manager.registerMany([
    {
      provider:
        createProvider(
          "failing-runtime",
          2,
          async () => {
            failingCalls++;

            throw new Error(
              "Runtime provider failure",
            );
          },
        ),

      retryPolicy: {
        maximumAttempts:
          1,

        retryDelayMs:
          0,

        timeoutMs:
          1000,

        circuitBreakerThreshold:
          1,

        circuitBreakerResetMs:
          60_000,
      },

      dependencies: {
        now:
          () =>
            new Date(
              currentTime.getTime(),
            ),
      },
    },

    {
      provider:
        createProvider(
          "unknown-runtime",
          3,
          async () => ({
            providerId:
              "unknown-runtime",

            discovered:
              [],

            durationMs:
              5,
          }),
        ),
    },
  ]);

assert.equal(
  manager.has(
    "healthy-runtime",
  ),
  true,
);

assert.equal(
  manager.has(
    "missing-runtime",
  ),
  false,
);

assert.equal(
  manager.get(
    "healthy-runtime",
  ),
  healthyProvider,
);

assert.equal(
  manager.get(
    "missing-runtime",
  ),
  null,
);

assert.deepEqual(
  manager.list().map(
    provider =>
      provider.metadata().id,
  ),
  [
    "healthy-runtime",
    "failing-runtime",
    "unknown-runtime",
  ],
);

assert.equal(
  registry.get(
    "healthy-runtime",
  ),
  healthyProvider,
);

assert.equal(
  registry.get(
    "failing-runtime",
  ),
  failingProvider,
);

assert.equal(
  registry.get(
    "unknown-runtime",
  ),
  unknownProvider,
);

await healthyProvider.discover({
  runId:
    "healthy-runtime-run",

  startedAt,
});

assert.equal(
  healthyCalls,
  1,
);

const healthyStatistics =
  manager.statistics(
    "healthy-runtime",
  );

assert.ok(
  healthyStatistics,
);

assert.equal(
  healthyStatistics.totalExecutions,
  1,
);

assert.equal(
  healthyStatistics.successfulExecutions,
  1,
);

const healthySnapshot =
  manager.snapshot(
    "healthy-runtime",
  );

assert.ok(
  healthySnapshot,
);

assert.equal(
  healthySnapshot.providerId,
  "healthy-runtime",
);

assert.equal(
  healthySnapshot.health.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  healthySnapshot.reliability
    .successfulExecutions,
  1,
);

assert.equal(
  manager.statistics(
    "missing-runtime",
  ),
  null,
);

assert.equal(
  manager.health(
    "missing-runtime",
  ),
  null,
);

assert.equal(
  manager.snapshot(
    "missing-runtime",
  ),
  null,
);

await assert.rejects(
  failingProvider.discover({
    runId:
      "failing-runtime-run",

    startedAt,
  }),

  /Runtime provider failure/,
);

assert.equal(
  failingCalls,
  1,
);

const circuitSnapshot =
  manager.snapshot(
    "failing-runtime",
  );

assert.ok(
  circuitSnapshot,
);

assert.equal(
  circuitSnapshot.health.status,
  ProviderHealthStatus.CIRCUIT_OPEN,
);

assert.equal(
  circuitSnapshot.reliability
    .circuitOpen,
  true,
);

await assert.rejects(
  failingProvider.discover({
    runId:
      "failing-runtime-blocked",

    startedAt,
  }),

  error =>
    error instanceof
    ProviderCircuitOpenError,
);

assert.equal(
  failingCalls,
  1,
);

manager.resetCircuit(
  "failing-runtime",
);

assert.equal(
  manager.statistics(
    "failing-runtime",
  )?.circuitOpen,
  false,
);

assert.equal(
  manager.health(
    "failing-runtime",
  )?.status,
  ProviderHealthStatus.UNHEALTHY,
);

const summary =
  manager.healthSummary();

assert.equal(
  summary.totalProviders,
  3,
);

assert.equal(
  summary.healthy,
  1,
);

assert.equal(
  summary.unhealthy,
  1,
);

assert.equal(
  summary.unknown,
  1,
);

assert.throws(
  () =>
    manager.register({
      provider:
        createProvider(
          "healthy-runtime",
          10,
          async () => ({
            providerId:
              "healthy-runtime",

            discovered:
              [],

            durationMs:
              1,
          }),
        ),
    }),

  /already registered/,
);

assert.throws(
  () =>
    manager.resetCircuit(
      "missing-runtime",
    ),

  /not registered/,
);

const externalRegistry =
  new ProviderRegistry();

externalRegistry.register(
  createProvider(
    "external-provider",
    1,
    async () => ({
      providerId:
        "external-provider",

      discovered:
        [],

      durationMs:
        1,
    }),
  ),
);

const externalManager =
  new ProviderRuntimeManager(
    externalRegistry,
    new ProviderHealthMonitor(),
  );

assert.throws(
  () =>
    externalManager.register({
      provider:
        createProvider(
          "external-provider",
          1,
          async () => ({
            providerId:
              "external-provider",

            discovered:
              [],

            durationMs:
              1,
          }),
        ),
    }),

  /already registered in the provider registry/,
);

currentTime =
  new Date(
    currentTime.getTime() +
      1000,
  );

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredProviders:
        manager.list().map(
          provider =>
            provider.metadata().id,
        ),

      healthyExecutions:
        healthyStatistics
          .successfulExecutions,

      failingCalls,

      healthSummary: {
        totalProviders:
          summary.totalProviders,

        healthy:
          summary.healthy,

        unhealthy:
          summary.unhealthy,

        unknown:
          summary.unknown,
      },
    },
    null,
    2,
  ),
);
