import assert from "node:assert/strict";

import {
  HttpRequestBuilder,
} from "../../lib/http";

const request =
  HttpRequestBuilder
    .post(
      "https://example.com/api",
    )
    .timeout(
      5000,
    )
    .userAgent(
      "DealsEngine/1.0",
    )
    .header(
      "Accept",
      "application/json",
    )
    .headers({
      "X-App":
        "Deals",
    })
    .query({
      page:2,
      active:true,
    })
    .body({
      hello:"world",
    })
    .build();

assert.equal(
  request.method,
  "POST",
);

assert.equal(
  request.timeoutMs,
  5000,
);

assert.equal(
  request.userAgent,
  "DealsEngine/1.0",
);

assert.equal(
  request.headers?.Accept,
  "application/json",
);

assert.equal(
  request.headers?.["X-App"],
  "Deals",
);

assert.equal(
  request.query?.page,
  2,
);

assert.equal(
  request.query?.active,
  true,
);

assert.deepEqual(
  request.body,
  {
    hello:"world",
  },
);

const clone =
  HttpRequestBuilder
    .get(
      "https://example.com",
    )
    .header(
      "A",
      "B",
    )
    .build();

clone.headers!.A =
  "Changed";

const original =
  HttpRequestBuilder
    .get(
      "https://example.com",
    )
    .header(
      "A",
      "B",
    )
    .build();

assert.equal(
  original.headers?.A,
  "B",
);

console.log(
  JSON.stringify(
    {
      status:"passed",
      method:request.method,
    },
    null,
    2,
  ),
);
