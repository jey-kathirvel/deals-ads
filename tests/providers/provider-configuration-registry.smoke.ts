import assert from "node:assert/strict";

import {
  ProviderConfigurationRegistry,
} from "../../lib/providers";

const registry =
  new ProviderConfigurationRegistry();

registry.register({
  providerId:
    "amazon",

  enabled:
    true,

  priority:
    10,

  timeoutMs:
    5000,

  retryAttempts:
    2,

  retryDelayMs:
    100,

  circuitBreakerThreshold:
    5,

  circuitBreakerResetMs:
    60000,

  metadata: {
    region:
      "IN",
  },
});

registry.register({
  providerId:
    "flipkart",

  enabled:
    false,

  priority:
    20,

  timeoutMs:
    4000,

  retryAttempts:
    1,

  retryDelayMs:
    50,

  circuitBreakerThreshold:
    3,

  circuitBreakerResetMs:
    45000,

  metadata: {},
});

assert.equal(
  registry.count(),
  2,
);

assert.deepEqual(
  registry.list().map(
    x => x.providerId,
  ),
  [
    "amazon",
    "flipkart",
  ],
);

const updated =
  registry.update(
    "flipkart",
    {
      enabled:
        true,
      priority:
        5,
      metadata: {
        region:
          "IN",
      },
    },
  );

assert.equal(
  updated.enabled,
  true,
);

assert.equal(
  updated.priority,
  5,
);

assert.deepEqual(
  registry.list().map(
    x => x.providerId,
  ),
  [
    "flipkart",
    "amazon",
  ],
);

updated.metadata.region =
  "US";

assert.equal(
  registry.get(
    "flipkart",
  )?.metadata.region,
  "IN",
);

assert.equal(
  registry.remove(
    "amazon",
  ),
  true,
);

assert.equal(
  registry.remove(
    "amazon",
  ),
  false,
);

assert.equal(
  registry.count(),
  1,
);

assert.throws(
  () =>
    registry.register({
      providerId:
        "",
      enabled:
        true,
      priority:
        1,
      timeoutMs:
        1,
      retryAttempts:
        1,
      retryDelayMs:
        1,
      circuitBreakerThreshold:
        1,
      circuitBreakerResetMs:
        1,
      metadata:
        {},
    }),
);

assert.throws(
  () =>
    registry.update(
      "missing",
      {},
    ),
);

registry.clear();

assert.equal(
  registry.count(),
  0,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",
      count:
        registry.count(),
    },
    null,
    2,
  ),
);
