import assert from "node:assert/strict";

import {
  ProviderConfigurationRegistry,
  ProviderConfigurationService,
} from "../../lib/providers";

const generatedAt =
  new Date(
    "2026-07-25T16:00:00.000Z",
  );

const registry =
  new ProviderConfigurationRegistry();

const service =
  new ProviderConfigurationService(
    registry,
    {
      now:
        () =>
          new Date(
            generatedAt.getTime(),
          ),

      defaults: {
        timeoutMs:
          8000,

        retryAttempts:
          2,

        retryDelayMs:
          150,

        circuitBreakerThreshold:
          4,

        circuitBreakerResetMs:
          45_000,
      },
    },
  );

const amazon =
  service.register({
    providerId:
      "amazon-config",

    enabled:
      true,

    priority:
      10,

    metadata: {
      region:
        "IN",

      affiliate:
        true,
    },
  });

assert.equal(
  amazon.timeoutMs,
  8000,
);

assert.equal(
  amazon.retryAttempts,
  2,
);

assert.equal(
  amazon.retryDelayMs,
  150,
);

assert.equal(
  amazon.circuitBreakerThreshold,
  4,
);

assert.equal(
  amazon.circuitBreakerResetMs,
  45_000,
);

const flipkart =
  service.register({
    providerId:
      "flipkart-config",

    enabled:
      false,

    priority:
      20,

    timeoutMs:
      12_000,

    retryAttempts:
      5,

    metadata: {
      region:
        "IN",
    },
  });

assert.equal(
  flipkart.timeoutMs,
  12_000,
);

assert.equal(
  flipkart.retryAttempts,
  5,
);

assert.equal(
  registry.count(),
  2,
);

const enabledFlipkart =
  service.enable(
    "flipkart-config",
  );

assert.equal(
  enabledFlipkart.enabled,
  true,
);

const disabledAmazon =
  service.disable(
    "amazon-config",
  );

assert.equal(
  disabledAmazon.enabled,
  false,
);

const reprioritized =
  service.setPriority(
    "flipkart-config",
    5,
  );

assert.equal(
  reprioritized.priority,
  5,
);

assert.deepEqual(
  registry.list().map(
    configuration =>
      configuration.providerId,
  ),
  [
    "flipkart-config",
    "amazon-config",
  ],
);

const updatedAmazon =
  service.update(
    "amazon-config",
    {
      timeoutMs:
        15_000,

      metadata: {
        marketplace:
          "amazon.in",
      },
    },
  );

assert.equal(
  updatedAmazon.timeoutMs,
  15_000,
);

assert.deepEqual(
  updatedAmazon.metadata,
  {
    region:
      "IN",

    affiliate:
      true,

    marketplace:
      "amazon.in",
  },
);

const metadataUpdated =
  service.setMetadata(
    "amazon-config",
    "commissionRate",
    4.5,
  );

assert.equal(
  metadataUpdated
    .metadata
    .commissionRate,
  4.5,
);

const metadataRemoved =
  service.removeMetadata(
    "amazon-config",
    "affiliate",
  );

assert.equal(
  "affiliate" in
    metadataRemoved.metadata,
  false,
);

assert.equal(
  metadataRemoved.metadata.region,
  "IN",
);

assert.equal(
  metadataRemoved
    .metadata
    .marketplace,
  "amazon.in",
);

assert.equal(
  service.listEnabled().length,
  1,
);

assert.equal(
  service.listEnabled()[0]
    .providerId,
  "flipkart-config",
);

assert.equal(
  service.listDisabled().length,
  1,
);

assert.equal(
  service.listDisabled()[0]
    .providerId,
  "amazon-config",
);

assert.equal(
  service.get(
    "missing-config",
  ),
  null,
);

assert.throws(
  () =>
    service.require(
      "missing-config",
    ),

  /was not found/,
);

assert.throws(
  () =>
    service.setMetadata(
      "amazon-config",
      "   ",
      "invalid",
    ),

  /Metadata key must not be empty/,
);

const snapshot =
  service.snapshot();

assert.equal(
  snapshot.generatedAt
    .toISOString(),
  generatedAt.toISOString(),
);

assert.equal(
  snapshot.totalProviders,
  2,
);

assert.equal(
  snapshot.enabledProviders,
  1,
);

assert.equal(
  snapshot.disabledProviders,
  1,
);

assert.deepEqual(
  snapshot.configurations.map(
    configuration =>
      configuration.providerId,
  ),
  [
    "flipkart-config",
    "amazon-config",
  ],
);

snapshot.generatedAt.setUTCFullYear(
  2035,
);

snapshot.configurations[0]
  .metadata.region =
    "US";

const immutableSnapshot =
  service.snapshot();

assert.equal(
  immutableSnapshot.generatedAt
    .getUTCFullYear(),
  2026,
);

assert.equal(
  immutableSnapshot
    .configurations[0]
    .metadata.region,
  "IN",
);

assert.equal(
  service.remove(
    "amazon-config",
  ),
  true,
);

assert.equal(
  service.remove(
    "amazon-config",
  ),
  false,
);

assert.equal(
  registry.count(),
  1,
);

assert.throws(
  () =>
    new ProviderConfigurationService(
      new ProviderConfigurationRegistry(),
      {
        defaults: {
          timeoutMs:
            -1,
        },
      },
    ),

  /timeoutMs default must be >= 0/,
);

service.clear();

assert.equal(
  registry.count(),
  0,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      registeredBeforeClear:
        snapshot.totalProviders,

      enabledBeforeClear:
        snapshot.enabledProviders,

      disabledBeforeClear:
        snapshot.disabledProviders,

      remainingAfterClear:
        registry.count(),
    },
    null,
    2,
  ),
);
