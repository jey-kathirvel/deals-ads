import assert from "node:assert/strict";

import {
  HttpRateLimitMiddleware,
  MiddlewareHttpClient,
} from "../../lib/http";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
  HttpRateLimitContext,
} from "../../lib/http";

interface ResultBody {
  sequence: number;
}

class CaptureClient
  implements HttpClient
{
  readonly requests:
    HttpRequest[] = [];

  readonly executionOrder:
    string[] = [];

  async request<TBody = unknown>(
    request: HttpRequest,
  ): Promise<HttpResponse<TBody>> {
    this.requests.push(
      request,
    );

    this.executionOrder.push(
      String(
        request.headers?.["X-Request-Id"],
      ),
    );

    return {
      status:
        200,
      statusText:
        "OK",
      url:
        request.url,
      headers:
        {},
      durationMs:
        1,
      body: {
        sequence:
          this.requests.length,
      } as TBody,
    };
  }
}

const acquisitionEvents:
  HttpRateLimitContext[] = [];

const terminal =
  new CaptureClient();

const client =
  new MiddlewareHttpClient({
    client:
      terminal,

    middleware: [
      new HttpRateLimitMiddleware({
        requestsPerSecond:
          100,
        burstCapacity:
          1,
        key:
          "amazon",
        onAcquire:
          (
            context,
          ) => {
            acquisitionEvents.push(
              context,
            );
          },
      }),
    ],
  });

const requests =
  ["first", "second", "third"]
    .map(
      (
        requestId,
      ) =>
        client.request<ResultBody>({
          method:
            "GET",
          url:
            `https://example.com/${requestId}`,
          headers: {
            "X-Request-Id":
              requestId,
          },
        }),
    );

const responses =
  await Promise.all(
    requests,
  );

assert.equal(
  responses.length,
  3,
);

assert.deepEqual(
  terminal.executionOrder,
  [
    "first",
    "second",
    "third",
  ],
);

assert.equal(
  acquisitionEvents.length,
  3,
);

assert.equal(
  acquisitionEvents[0]
    ?.key,
  "amazon",
);

assert.equal(
  acquisitionEvents[0]
    ?.waitMs,
  0,
);

assert.ok(
  (
    acquisitionEvents[1]
      ?.waitMs ??
    0
  ) >= 1,
);

const providerTerminal =
  new CaptureClient();

const providerClient =
  new MiddlewareHttpClient({
    client:
      providerTerminal,

    middleware: [
      new HttpRateLimitMiddleware({
        requestsPerSecond:
          1,
        burstCapacity:
          1,
        keyProvider:
          (
            request,
          ) =>
            String(
              request.headers
                ?.["X-Provider"],
            ),
      }),
    ],
  });

await Promise.all([
  providerClient.request({
    method:
      "GET",
    url:
      "https://example.com/amazon",
    headers: {
      "X-Provider":
        "amazon",
      "X-Request-Id":
        "amazon",
    },
  }),

  providerClient.request({
    method:
      "GET",
    url:
      "https://example.com/flipkart",
    headers: {
      "X-Provider":
        "flipkart",
      "X-Request-Id":
        "flipkart",
    },
  }),
]);

assert.equal(
  providerTerminal
    .requests
    .length,
  2,
);

const abortTerminal =
  new CaptureClient();

const abortClient =
  new MiddlewareHttpClient({
    client:
      abortTerminal,

    middleware: [
      new HttpRateLimitMiddleware({
        requestsPerSecond:
          1,
        burstCapacity:
          1,
      }),
    ],
  });

await abortClient.request({
  method:
    "GET",
  url:
    "https://example.com/initial",
  headers: {
    "X-Request-Id":
      "initial",
  },
});

const abortController =
  new AbortController();

const queuedRequest =
  abortClient.request({
    method:
      "GET",
    url:
      "https://example.com/queued",
    headers: {
      "X-Request-Id":
        "queued",
    },
    signal:
      abortController.signal,
  });

abortController.abort(
  new Error(
    "rate limit cancelled",
  ),
);

await assert.rejects(
  () =>
    queuedRequest,
  /rate limit cancelled/,
);

assert.deepEqual(
  abortTerminal.executionOrder,
  [
    "initial",
  ],
);

const immutableTerminal =
  new CaptureClient();

const immutableClient =
  new MiddlewareHttpClient({
    client:
      immutableTerminal,

    middleware: [
      new HttpRateLimitMiddleware({
        requestsPerSecond:
          10,
      }),
    ],
  });

const originalRequest:
  HttpRequest = {
    method:
      "GET",
    url:
      "https://example.com/immutable",
    headers: {
      "X-Request-Id":
        "immutable",
    },
    query: {
      page:
        1,
    },
  };

await immutableClient.request(
  originalRequest,
);

assert.deepEqual(
  originalRequest,
  {
    method:
      "GET",
    url:
      "https://example.com/immutable",
    headers: {
      "X-Request-Id":
        "immutable",
    },
    query: {
      page:
        1,
    },
  },
);

assert.throws(
  () =>
    new HttpRateLimitMiddleware({
      requestsPerSecond:
        0,
    }),
  /greater than 0/,
);

assert.throws(
  () =>
    new HttpRateLimitMiddleware({
      requestsPerSecond:
        1,
      burstCapacity:
        0,
    }),
  /positive integer/,
);

assert.throws(
  () =>
    new HttpRateLimitMiddleware({
      requestsPerSecond:
        1,
      key:
        "amazon",
      keyProvider:
        () =>
          "flipkart",
    }),
  /cannot use both key and keyProvider/,
);

const emptyKeyClient =
  new MiddlewareHttpClient({
    client:
      new CaptureClient(),

    middleware: [
      new HttpRateLimitMiddleware({
        requestsPerSecond:
          1,
        keyProvider:
          () =>
            "   ",
      }),
    ],
  });

await assert.rejects(
  () =>
    emptyKeyClient.request({
      method:
        "GET",
      url:
        "https://example.com/empty-key",
    }),
  /key cannot be empty/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",
      fifo:
        true,
      perProvider:
        true,
      abort:
        true,
      immutable:
        true,
    },
    null,
    2,
  ),
);
