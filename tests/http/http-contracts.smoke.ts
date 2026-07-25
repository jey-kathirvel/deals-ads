import assert from "node:assert/strict";

import {
  HttpNetworkError,
  HttpTimeoutError,
  appendQuery,
  applyRequestDefaults,
  cloneRequest,
  mergeHeaders,
  normalizeHeaders,
  validateRequest,
} from "../../lib/http";

const normalized =
  normalizeHeaders({
    Accept:
      "application/json",

    "X-Test":
      10,

    Enabled:
      true,
  });

assert.deepEqual(
  normalized,
  {
    accept:
      "application/json",

    "x-test":
      "10",

    enabled:
      "true",
  },
);

assert.deepEqual(
  mergeHeaders(
    {
      Accept:
        "text/plain",

      "X-Source":
        "default",
    },
    {
      accept:
        "application/json",

      "X-Source":
        "request",
    },
  ),
  {
    accept:
      "application/json",

    "x-source":
      "request",
  },
);

const queriedUrl =
  appendQuery(
    "https://example.com/deals?existing=1",
    {
      page:
        2,

      active:
        true,

      empty:
        null,

      missing:
        undefined,

      keyword:
        "mobile phone",
    },
  );

const parsedUrl =
  new URL(
    queriedUrl,
  );

assert.equal(
  parsedUrl.searchParams.get(
    "existing",
  ),
  "1",
);

assert.equal(
  parsedUrl.searchParams.get(
    "page",
  ),
  "2",
);

assert.equal(
  parsedUrl.searchParams.get(
    "active",
  ),
  "true",
);

assert.equal(
  parsedUrl.searchParams.get(
    "keyword",
  ),
  "mobile phone",
);

assert.equal(
  parsedUrl.searchParams.has(
    "empty",
  ),
  false,
);

const resolved =
  applyRequestDefaults(
    {
      method:
        "GET",

      url:
        "https://example.com/deals",

      headers: {
        Accept:
          "application/json",
      },
    },
    {
      timeoutMs:
        5000,

      userAgent:
        "deals-ads/1.0",

      headers: {
        "X-Platform":
          "deals-ads",

        Accept:
          "text/plain",
      },
    },
  );

assert.equal(
  resolved.timeoutMs,
  5000,
);

assert.equal(
  resolved.userAgent,
  "deals-ads/1.0",
);

assert.deepEqual(
  resolved.headers,
  {
    "x-platform":
      "deals-ads",

    accept:
      "application/json",

    "user-agent":
      "deals-ads/1.0",
  },
);

validateRequest(
  resolved,
);

assert.throws(
  () =>
    validateRequest({
      method:
        "GET",

      url:
        "",
    }),

  /URL must not be empty/,
);

assert.throws(
  () =>
    validateRequest({
      method:
        "GET",

      url:
        "https://example.com",

      timeoutMs:
        0,
    }),

  /timeoutMs must be greater than 0/,
);

const originalBody =
  new Uint8Array([
    1,
    2,
    3,
  ]);

const original = {
  method:
    "POST" as const,

  url:
    "https://example.com/deals",

  headers: {
    Accept:
      "application/json",
  },

  query: {
    page:
      1,
  },

  body:
    originalBody,
};

const cloned =
  cloneRequest(
    original,
  );

assert.notEqual(
  cloned,
  original,
);

assert.notEqual(
  cloned.headers,
  original.headers,
);

assert.notEqual(
  cloned.query,
  original.query,
);

assert.notEqual(
  cloned.body,
  original.body,
);

assert.deepEqual(
  cloned.body,
  original.body,
);

const timeoutError =
  new HttpTimeoutError(
    resolved,
    5000,
  );

assert.equal(
  timeoutError.name,
  "HttpTimeoutError",
);

assert.equal(
  timeoutError.timeoutMs,
  5000,
);

assert.equal(
  timeoutError.request.url,
  resolved.url,
);

const networkError =
  new HttpNetworkError(
    resolved,
    new Error(
      "connection reset",
    ),
  );

assert.equal(
  networkError.name,
  "HttpNetworkError",
);

assert.equal(
  networkError.request.url,
  resolved.url,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      normalizedHeaders:
        Object.keys(
          normalized,
        ).length,

      requestTimeoutMs:
        resolved.timeoutMs,

      queryParameters:
        Array.from(
          parsedUrl.searchParams.keys(),
        ).length,
    },
    null,
    2,
  ),
);
