import assert from "node:assert/strict";

import {
  ProviderRequestBuilder,
  withJsonBody,
  withProviderHeaders,
  withProviderQuery,
  withProviderUserAgent,
} from "../../lib/providers";

const builder =
  new ProviderRequestBuilder({
    baseUrl:
      "https://api.example.com/",

    defaultHeaders: {
      Accept:
        "application/json",
      "X-Default":
        "default",
    },

    defaultQuery: {
      locale:
        "en-US",
      page:
        1,
    },
  });

const getRequest =
  builder.get(
    "deals/search",
    {
      headers: {
        "X-Request":
          "search",
      },

      query: {
        page:
          2,
        limit:
          25,
      },
    },
  );

assert.equal(
  getRequest.method,
  "GET",
);

assert.equal(
  getRequest.url,
  "https://api.example.com/deals/search",
);

assert.deepEqual(
  getRequest.headers,
  {
    Accept:
      "application/json",
    "X-Default":
      "default",
    "X-Request":
      "search",
  },
);

assert.deepEqual(
  getRequest.query,
  {
    locale:
      "en-US",
    page:
      2,
    limit:
      25,
  },
);

const payload = {
  query:
    "laptop",
};

const postRequest =
  withProviderUserAgent(
    withJsonBody(
      builder.post(
        "/deals",
      ),
      payload,
    ),
    "amazon",
    "v1",
  );

assert.equal(
  postRequest.method,
  "POST",
);

assert.equal(
  postRequest.url,
  "https://api.example.com/deals",
);

assert.equal(
  postRequest.headers?.["Content-Type"],
  "application/json",
);

assert.equal(
  postRequest.headers?.Accept,
  "application/json",
);

assert.equal(
  postRequest.headers?.["User-Agent"],
  "deals-engine/amazon/v1",
);

assert.deepEqual(
  postRequest.body,
  payload,
);

const original =
  builder.get(
    "/immutable",
    {
      headers: {
        "X-Original":
          "yes",
      },
      query: {
        cursor:
          "one",
      },
    },
  );

const enriched =
  withProviderQuery(
    withProviderHeaders(
      original,
      {
        "X-Added":
          "yes",
      },
    ),
    {
      cursor:
        "two",
    },
  );

assert.equal(
  original.headers?.["X-Added"],
  undefined,
);

assert.equal(
  original.query?.cursor,
  "one",
);

assert.equal(
  enriched.headers?.["X-Added"],
  "yes",
);

assert.equal(
  enriched.query?.cursor,
  "two",
);

const absolute =
  builder.build({
    method:
      "DELETE",
    url:
      "https://other.example.com/item/10",
  });

assert.equal(
  absolute.url,
  "https://other.example.com/item/10",
);

assert.throws(
  () =>
    new ProviderRequestBuilder({
      baseUrl:
        "   ",
    }),
  /baseUrl cannot be empty/,
);

assert.throws(
  () =>
    builder.build({
      method:
        "GET",
      path:
        "/one",
      url:
        "https://example.com/two",
    }),
  /cannot use both path and url/,
);

assert.throws(
  () =>
    withProviderUserAgent(
      original,
      " ",
      "v1",
    ),
  /providerId cannot be empty/,
);

assert.throws(
  () =>
    withProviderUserAgent(
      original,
      "amazon",
      " ",
    ),
  /version cannot be empty/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",
      requestBuilder:
        true,
      helpers:
        true,
      immutable:
        true,
    },
    null,
    2,
  ),
);
