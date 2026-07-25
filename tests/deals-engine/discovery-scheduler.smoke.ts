import assert from "node:assert/strict";

import type {
  DiscoveryContext,
  DiscoveryProvider,
  ProviderDiscoveryResult,
} from "../../lib/deals-engine/contracts";

import {
  DiscoveryScheduler,
} from "../../lib/deals-engine/core/discovery-scheduler";

class SuccessfulProvider
implements DiscoveryProvider {

  readonly info = {
    id: "smoke-success",
    name: "Smoke Success Provider",
    version: "1.0.0",
    enabled: true,
  };

  async discover(
    _context: DiscoveryContext,
  ): Promise<ProviderDiscoveryResult> {

    await new Promise<void>(
      resolve =>
        setTimeout(resolve, 25),
    );

    return {
      providerId:
        this.info.id,

      providerName:
        this.info.name,

      success: true,

      discovered: 0,

      deals: [],

      errors: [],

      durationMs: 25,
    };
  }
}

class FailedProvider
implements DiscoveryProvider {

  readonly info = {
    id: "smoke-failure",
    name: "Smoke Failure Provider",
    version: "1.0.0",
    enabled: true,
  };

  async discover(
    _context: DiscoveryContext,
  ): Promise<ProviderDiscoveryResult> {

    throw new Error(
      "Expected smoke-test failure",
    );
  }
}

async function main(): Promise<void> {

  const scheduler =
    new DiscoveryScheduler(
      undefined,
      [],
      false,
    );

  scheduler.register(
    new SuccessfulProvider(),
  );

  scheduler.register(
    new FailedProvider(),
  );

  const context:
    DiscoveryContext = {

      runId:
        "scheduler-smoke-test",

      targetCount:
        100,

      startedAt:
        new Date(),
    };

  const result =
    await scheduler.run(
      context,
    );

  assert.equal(
    result.providers,
    2,
  );

  assert.equal(
    result.succeeded,
    1,
  );

  assert.equal(
    result.failed,
    1,
  );

  assert.equal(
    result.discovered,
    0,
  );

  assert.equal(
    result.validated,
    0,
  );

  assert.equal(
    result.published,
    0,
  );

  assert.equal(
    result.deals.length,
    0,
  );

  assert.equal(
    result.errors.length,
    1,
  );

  assert.match(
    result.errors[0],
    /Expected smoke-test failure/,
  );

  assert.equal(
    scheduler.providers().length,
    2,
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        providers:
          result.providers,
        succeeded:
          result.succeeded,
        failed:
          result.failed,
        discovered:
          result.discovered,
        published:
          result.published,
        errors:
          result.errors,
      },
      null,
      2,
    ),
  );
}

main().catch(
  error => {

    console.error(error);

    process.exitCode = 1;
  },
);
