import assert from "node:assert/strict";

import {
  ResilientProvider,
  ProviderCircuitOpenError,
  ProviderTimeoutError,
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
    "2026-07-25T00:00:00.000Z",
  );

const sleepCalls:
  number[] = [];

let retryAttempts = 0;

const eventuallySuccessfulProvider:
  DealProvider = {
    metadata() {
      return {
        id:
          "retry-provider",

        name:
          "Retry Provider",

        enabled:
          true,

        priority:
          1,
      };
    },

    async discover() {
      retryAttempts++;

      if (
        retryAttempts < 3
      ) {
        throw new Error(
          "Temporary provider failure",
        );
      }

      return {
        providerId:
          "retry-provider",

        discovered:
          [],

        durationMs:
          25,
      };
    },
  };

const retryingProvider =
  new ResilientProvider(
    eventuallySuccessfulProvider,
    {
      maximumAttempts:
        3,

      retryDelayMs:
        50,

      timeoutMs:
        1000,

      circuitBreakerThreshold:
        2,

      circuitBreakerResetMs:
        5000,
    },
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),

      sleep:
        async milliseconds => {
          sleepCalls.push(
            milliseconds,
          );
        },
    },
  );

const successfulResult =
  await retryingProvider.discover({
    runId:
      "retry-run",

    startedAt,
  });

assert.equal(
  successfulResult.providerId,
  "retry-provider",
);

assert.equal(
  retryAttempts,
  3,
);

assert.deepEqual(
  sleepCalls,
  [
    50,
    50,
  ],
);

assert.deepEqual(
  retryingProvider.statistics(),
  {
    totalExecutions:
      1,

    successfulExecutions:
      1,

    failedExecutions:
      0,

    timedOutExecutions:
      0,

    totalAttempts:
      3,

    consecutiveFailures:
      0,

    circuitOpen:
      false,

    circuitOpenedAt:
      null,
  },
);

let failingAttempts = 0;

const alwaysFailingProvider:
  DealProvider = {
    metadata() {
      return {
        id:
          "failing-provider",

        name:
          "Failing Provider",

        enabled:
          true,

        priority:
          2,
      };
    },

    async discover() {
      failingAttempts++;

      throw new Error(
        "Permanent provider failure",
      );
    },
  };

const circuitProvider =
  new ResilientProvider(
    alwaysFailingProvider,
    {
      maximumAttempts:
        2,

      retryDelayMs:
        0,

      timeoutMs:
        1000,

      circuitBreakerThreshold:
        2,

      circuitBreakerResetMs:
        5000,
    },
    {
      now:
        () =>
          new Date(
            currentTime.getTime(),
          ),
    },
  );

await assert.rejects(
  circuitProvider.discover({
    runId:
      "failure-run-1",

    startedAt,
  }),

  /Permanent provider failure/,
);

assert.equal(
  failingAttempts,
  2,
);

assert.equal(
  circuitProvider.statistics()
    .circuitOpen,
  false,
);

await assert.rejects(
  circuitProvider.discover({
    runId:
      "failure-run-2",

    startedAt,
  }),

  /Permanent provider failure/,
);

assert.equal(
  failingAttempts,
  4,
);

const openedStatistics =
  circuitProvider.statistics();

assert.equal(
  openedStatistics.failedExecutions,
  2,
);

assert.equal(
  openedStatistics.consecutiveFailures,
  2,
);

assert.equal(
  openedStatistics.circuitOpen,
  true,
);

assert.ok(
  openedStatistics.circuitOpenedAt,
);

await assert.rejects(
  circuitProvider.discover({
    runId:
      "failure-run-blocked",

    startedAt,
  }),

  error =>
    error instanceof
    ProviderCircuitOpenError,
);

assert.equal(
  failingAttempts,
  4,
);

currentTime =
  new Date(
    currentTime.getTime() +
      5000,
  );

await assert.rejects(
  circuitProvider.discover({
    runId:
      "failure-run-after-reset",

    startedAt,
  }),

  /Permanent provider failure/,
);

assert.equal(
  failingAttempts,
  6,
);

const resetAttemptStatistics =
  circuitProvider.statistics();

assert.equal(
  resetAttemptStatistics.totalExecutions,
  3,
);

assert.equal(
  resetAttemptStatistics.failedExecutions,
  3,
);

let timeoutAttempts = 0;

const timeoutProvider =
  new ResilientProvider(
    {
      metadata() {
        return {
          id:
            "timeout-provider",

          name:
            "Timeout Provider",

          enabled:
            true,

          priority:
            3,
        };
      },

      async discover() {
        timeoutAttempts++;

        return new Promise(
          () => {
            // Intentionally unresolved.
          },
        );
      },
    },
    {
      maximumAttempts:
        2,

      retryDelayMs:
        0,

      timeoutMs:
        10,

      circuitBreakerThreshold:
        3,

      circuitBreakerResetMs:
        5000,
    },
  );

await assert.rejects(
  timeoutProvider.discover({
    runId:
      "timeout-run",

    startedAt,
  }),

  error =>
    error instanceof
    ProviderTimeoutError,
);

assert.equal(
  timeoutAttempts,
  2,
);

const timeoutStatistics =
  timeoutProvider.statistics();

assert.equal(
  timeoutStatistics.failedExecutions,
  1,
);

assert.equal(
  timeoutStatistics.timedOutExecutions,
  2,
);

assert.equal(
  timeoutStatistics.totalAttempts,
  2,
);

const metadata =
  retryingProvider.metadata();

metadata.name =
  "External Mutation";

assert.equal(
  retryingProvider.metadata().name,
  "Retry Provider",
);

assert.throws(
  () =>
    new ResilientProvider(
      eventuallySuccessfulProvider,
      {
        maximumAttempts:
          0,
      },
    ),

  /must be a positive integer/,
);

assert.throws(
  () =>
    new ResilientProvider(
      eventuallySuccessfulProvider,
      {
        retryDelayMs:
          -1,
      },
    ),

  /must be a non-negative integer/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      retry: {
        attempts:
          retryAttempts,

        successfulExecutions:
          retryingProvider.statistics()
            .successfulExecutions,

        retryDelays:
          sleepCalls,
      },

      circuitBreaker: {
        providerAttempts:
          failingAttempts,

        failedExecutions:
          resetAttemptStatistics
            .failedExecutions,

        circuitOpen:
          resetAttemptStatistics
            .circuitOpen,
      },

      timeout: {
        attempts:
          timeoutAttempts,

        timedOutExecutions:
          timeoutStatistics
            .timedOutExecutions,
      },
    },
    null,
    2,
  ),
);
