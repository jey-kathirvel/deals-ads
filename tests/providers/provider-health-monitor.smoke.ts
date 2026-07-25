import assert from "node:assert/strict";

import {
  ProviderCircuitOpenError,
  ProviderHealthMonitor,
  ProviderHealthStatus,
  ResilientProvider,
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
    "2026-07-25T01:00:00.000Z",
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

const healthyProvider =
  new ResilientProvider(
    createProvider(
      "healthy",
      1,
      async () => ({
        providerId:
          "healthy",

        discovered:
          [],

        durationMs:
          10,
      }),
    ),
    {
      maximumAttempts:
        1,

      retryDelayMs:
        0,

      timeoutMs:
        1000,

      circuitBreakerThreshold:
        5,

      circuitBreakerResetMs:
        60_000,
    },
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

let degradedCalls = 0;

const degradedProvider =
  new ResilientProvider(
    createProvider(
      "degraded",
      2,
      async () => {
        degradedCalls++;

        if (
          degradedCalls === 1
        ) {
          throw new Error(
            "Temporary failure",
          );
        }

        return {
          providerId:
            "degraded",

          discovered:
            [],

          durationMs:
            15,
        };
      },
    ),
    {
      maximumAttempts:
        1,

      retryDelayMs:
        0,

      timeoutMs:
        1000,

      circuitBreakerThreshold:
        5,

      circuitBreakerResetMs:
        60_000,
    },
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

const unhealthyProvider =
  new ResilientProvider(
    createProvider(
      "unhealthy",
      3,
      async () => {
        throw new Error(
          "Permanent failure",
        );
      },
    ),
    {
      maximumAttempts:
        1,

      retryDelayMs:
        0,

      timeoutMs:
        1000,

      circuitBreakerThreshold:
        5,

      circuitBreakerResetMs:
        60_000,
    },
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

const circuitProvider =
  new ResilientProvider(
    createProvider(
      "circuit",
      4,
      async () => {
        throw new Error(
          "Circuit failure",
        );
      },
    ),
    {
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
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

const unknownProvider =
  new ResilientProvider(
    createProvider(
      "unknown",
      5,
      async () => ({
        providerId:
          "unknown",

        discovered:
          [],

        durationMs:
          5,
      }),
    ),
    {
      maximumAttempts:
        1,
    },
  );

await healthyProvider.discover({
  runId:
    "healthy-run",

  startedAt,
});

await assert.rejects(
  degradedProvider.discover({
    runId:
      "degraded-run-1",

    startedAt,
  }),

  /Temporary failure/,
);

await degradedProvider.discover({
  runId:
    "degraded-run-2",

  startedAt,
});

for (
  let index = 0;
  index < 3;
  index++
) {
  await assert.rejects(
    unhealthyProvider.discover({
      runId:
        `unhealthy-run-${index}`,

      startedAt,
    }),

    /Permanent failure/,
  );
}

await assert.rejects(
  circuitProvider.discover({
    runId:
      "circuit-run-1",

    startedAt,
  }),

  /Circuit failure/,
);

await assert.rejects(
  circuitProvider.discover({
    runId:
      "circuit-run-blocked",

    startedAt,
  }),

  error =>
    error instanceof
    ProviderCircuitOpenError,
);

const monitor =
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

monitor.register(
  healthyProvider,
);

monitor.register(
  degradedProvider,
);

monitor.register(
  unhealthyProvider,
);

monitor.register(
  circuitProvider,
);

monitor.register(
  unknownProvider,
);

assert.equal(
  monitor.has(
    "healthy",
  ),
  true,
);

assert.equal(
  monitor.has(
    "missing",
  ),
  false,
);

const healthySnapshot =
  monitor.get(
    "healthy",
  );

assert.ok(
  healthySnapshot,
);

assert.equal(
  healthySnapshot.status,
  ProviderHealthStatus.HEALTHY,
);

assert.equal(
  healthySnapshot.failureRate,
  0,
);

assert.equal(
  healthySnapshot.successRate,
  1,
);

const degradedSnapshot =
  monitor.get(
    "degraded",
  );

assert.ok(
  degradedSnapshot,
);

assert.equal(
  degradedSnapshot.status,
  ProviderHealthStatus.DEGRADED,
);

assert.equal(
  degradedSnapshot.failureRate,
  0.5,
);

assert.equal(
  degradedSnapshot.successRate,
  0.5,
);

const unhealthySnapshot =
  monitor.get(
    "unhealthy",
  );

assert.ok(
  unhealthySnapshot,
);

assert.equal(
  unhealthySnapshot.status,
  ProviderHealthStatus.UNHEALTHY,
);

assert.equal(
  unhealthySnapshot.consecutiveFailures,
  3,
);

const circuitSnapshot =
  monitor.get(
    "circuit",
  );

assert.ok(
  circuitSnapshot,
);

assert.equal(
  circuitSnapshot.status,
  ProviderHealthStatus.CIRCUIT_OPEN,
);

assert.equal(
  circuitSnapshot.circuitOpen,
  true,
);

const unknownSnapshot =
  monitor.get(
    "unknown",
  );

assert.ok(
  unknownSnapshot,
);

assert.equal(
  unknownSnapshot.status,
  ProviderHealthStatus.UNKNOWN,
);

assert.equal(
  monitor.get(
    "missing",
  ),
  null,
);

const providerList =
  monitor.list();

assert.deepEqual(
  providerList.map(
    provider =>
      provider.providerId,
  ),
  [
    "healthy",
    "degraded",
    "unhealthy",
    "circuit",
    "unknown",
  ],
);

const summary =
  monitor.summary();

assert.equal(
  summary.totalProviders,
  5,
);

assert.equal(
  summary.healthy,
  1,
);

assert.equal(
  summary.degraded,
  1,
);

assert.equal(
  summary.unhealthy,
  1,
);

assert.equal(
  summary.circuitOpen,
  1,
);

assert.equal(
  summary.unknown,
  1,
);

summary.providers[0].providerName =
  "External Mutation";

assert.notEqual(
  monitor.get(
    "healthy",
  )?.providerName,
  "External Mutation",
);

monitor.resetCircuit(
  "circuit",
);

assert.equal(
  monitor.get(
    "circuit",
  )?.circuitOpen,
  false,
);

assert.equal(
  monitor.get(
    "circuit",
  )?.status,
  ProviderHealthStatus.UNHEALTHY,
);

assert.equal(
  monitor.unregister(
    "unknown",
  ),
  true,
);

assert.equal(
  monitor.unregister(
    "unknown",
  ),
  false,
);

assert.equal(
  monitor.summary()
    .totalProviders,
  4,
);

assert.throws(
  () =>
    monitor.register(
      healthyProvider,
    ),

  /already registered/,
);

assert.throws(
  () =>
    monitor.resetCircuit(
      "missing",
    ),

  /not registered/,
);

assert.throws(
  () =>
    new ProviderHealthMonitor({
      degradedFailureRate:
        0.8,

      unhealthyFailureRate:
        0.5,
    }),

  /cannot exceed/,
);

assert.throws(
  () =>
    new ProviderHealthMonitor({
      degradedConsecutiveFailures:
        4,

      unhealthyConsecutiveFailures:
        3,
    }),

  /cannot exceed/,
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

      totalProviders:
        summary.totalProviders,

      healthy:
        summary.healthy,

      degraded:
        summary.degraded,

      unhealthy:
        summary.unhealthy,

      circuitOpen:
        summary.circuitOpen,

      unknown:
        summary.unknown,

      providerOrder:
        providerList.map(
          provider =>
            provider.providerId,
        ),
    },
    null,
    2,
  ),
);
