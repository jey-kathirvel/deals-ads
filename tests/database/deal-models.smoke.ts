import assert from "node:assert/strict";

import {
  DealStatus,
  DealSource,
} from "../../lib/database/models";

assert.equal(
  DealStatus.DISCOVERED,
  "DISCOVERED",
);

assert.equal(
  DealStatus.PUBLISHED,
  "PUBLISHED",
);

assert.equal(
  DealSource.AMAZON,
  "AMAZON",
);

assert.equal(
  DealSource.FLIPKART,
  "FLIPKART",
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      statuses: Object.keys(DealStatus).length,
      sources: Object.keys(DealSource).length,
    },
    null,
    2,
  ),
);
