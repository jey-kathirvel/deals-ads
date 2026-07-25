import assert from "node:assert/strict";

import {
  ProviderRegistry,
} from "../../lib/providers";

const registry =
  new ProviderRegistry();

registry.register({
  metadata() {
    return {
      id: "amazon",
      name: "Amazon",
      enabled: true,
      priority: 2,
    };
  },

  async discover() {
    return {
      providerId: "amazon",
      discovered: [],
      durationMs: 10,
    };
  },
});

registry.register({
  metadata() {
    return {
      id: "flipkart",
      name: "Flipkart",
      enabled: true,
      priority: 1,
    };
  },

  async discover() {
    return {
      providerId: "flipkart",
      discovered: [],
      durationMs: 5,
    };
  },
});

const providers =
  registry.list();

assert.equal(
  providers.length,
  2,
);

assert.equal(
  providers[0].metadata().id,
  "flipkart",
);

assert.equal(
  providers[1].metadata().id,
  "amazon",
);

assert.ok(
  registry.get("amazon"),
);

assert.equal(
  registry.get("unknown"),
  undefined,
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      providers:
        providers.map(
          p =>
            p.metadata().id,
        ),
    },
    null,
    2,
  ),
);
