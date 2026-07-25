import assert from "node:assert/strict";

import {
  bootstrapProviderConfiguration,
} from "../../lib/providers";

const now =
  new Date(
    "2026-07-25T17:00:00.000Z",
  );

const bootstrap =
  bootstrapProviderConfiguration({
    defaults:{
      now:()=>new Date(now),

      defaults:{
        timeoutMs:7000,
        retryAttempts:2,
      },
    },

    requireProviders:true,

    providers:[
      {
        providerId:"amazon",
        enabled:true,
        priority:10,
      },
      {
        providerId:"flipkart",
        enabled:false,
        priority:20,
      },
    ],
  });

assert.equal(
  bootstrap.registry.count(),
  2,
);

assert.equal(
  bootstrap.service.snapshot()
    .generatedAt
    .toISOString(),
  now.toISOString(),
);

assert.deepEqual(
  bootstrap.configurations.map(
    c=>c.providerId,
  ),
  [
    "amazon",
    "flipkart",
  ],
);

assert.equal(
  bootstrap.service
    .get("amazon")
    ?.timeoutMs,
  7000,
);

assert.equal(
  bootstrap.service
    .get("amazon")
    ?.retryAttempts,
  2,
);

assert.throws(
  ()=>bootstrapProviderConfiguration({
    requireProviders:true,
  }),
  /At least one provider configuration is required/,
);

console.log(
  JSON.stringify(
    {
      status:"passed",
      providers:
        bootstrap.registry.count(),
    },
    null,
    2,
  ),
);
