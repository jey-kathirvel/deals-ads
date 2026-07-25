import assert from "node:assert/strict";

import {
  HttpNetworkError,
  HttpRetryMiddleware,
  MiddlewareHttpClient,
} from "../../lib/http";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
  HttpRetryContext,
} from "../../lib/http";

interface ResultBody {
  ok: boolean;
  attempt: number;
}

class SequenceClient
  implements HttpClient {

  attempts =
    0;

  constructor(
    private readonly sequence:
      Array<
        | number
        | Error
      >,
  ) {}

  async request<TBody = unknown>(
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
    this.attempts +=
      1;

    const result =
      this.sequence[
        Math.min(
          this.attempts - 1,
          this.sequence.length - 1,
        )
      ];

    if (
      result instanceof Error
    ) {
      throw result;
    }

    return {
      status:
        result ?? 200,

      statusText:
        result === 200
          ? "OK"
          : "Unavailable",

      url:
        request.url,

      headers:
        {},

      durationMs:
        1,

      body: {
        ok:
          result === 200,

        attempt:
          this.attempts,
      } as TBody,
    };
  }
}

const delays:
  number[] = [];

const retryEvents:
  Array<{
    retryNumber:
      number;

    status?:
      number;

    hasError:
      boolean;
  }> = [];

const statusClient =
  new SequenceClient([
    503,
    429,
    200,
  ]);

const statusPipeline =
  new MiddlewareHttpClient({
    client:
      statusClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          4,

        baseDelayMs:
          100,

        maxDelayMs:
          1_000,

        backoffMultiplier:
          2,

        sleep:
          async (
            delayMs,
          ) => {
            delays.push(
              delayMs,
            );
          },

        onRetry:
          (
            context,
          ) => {
            retryEvents.push({
              retryNumber:
                context.retryNumber,

              status:
                context.response
                  ?.status,

              hasError:
                context.error !==
                undefined,
            });
          },
      }),
    ],
  });

const statusResponse =
  await statusPipeline.request<ResultBody>({
    method:
      "GET",

    url:
      "https://example.com/deals",
  });

assert.equal(
  statusResponse.status,
  200,
);

assert.equal(
  statusResponse.body.attempt,
  3,
);

assert.equal(
  statusClient.attempts,
  3,
);

assert.deepEqual(
  delays,
  [
    100,
    200,
  ],
);

assert.deepEqual(
  retryEvents,
  [
    {
      retryNumber:
        1,

      status:
        503,

      hasError:
        false,
    },
    {
      retryNumber:
        2,

      status:
        429,

      hasError:
        false,
    },
  ],
);

const networkRequest:
  HttpRequest = {
    method:
      "GET",

    url:
      "https://example.com/network",
  };

const networkClient =
  new SequenceClient([
    new HttpNetworkError(
      networkRequest,
      new Error(
        "connection reset",
      ),
    ),
    200,
  ]);

const networkPipeline =
  new MiddlewareHttpClient({
    client:
      networkClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          1,

        baseDelayMs:
          0,

        maxDelayMs:
          0,
      }),
    ],
  });

const networkResponse =
  await networkPipeline.request<ResultBody>(
    networkRequest,
  );

assert.equal(
  networkResponse.status,
  200,
);

assert.equal(
  networkClient.attempts,
  2,
);

const exhaustedClient =
  new SequenceClient([
    503,
    503,
    503,
    200,
  ]);

const exhaustedPipeline =
  new MiddlewareHttpClient({
    client:
      exhaustedClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          2,

        baseDelayMs:
          0,

        maxDelayMs:
          0,
      }),
    ],
  });

const exhaustedResponse =
  await exhaustedPipeline.request<ResultBody>({
    method:
      "GET",

    url:
      "https://example.com/exhausted",
  });

assert.equal(
  exhaustedResponse.status,
  503,
);

assert.equal(
  exhaustedClient.attempts,
  3,
);

const postClient =
  new SequenceClient([
    503,
    200,
  ]);

const postPipeline =
  new MiddlewareHttpClient({
    client:
      postClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          3,

        baseDelayMs:
          0,

        maxDelayMs:
          0,
      }),
    ],
  });

const postResponse =
  await postPipeline.request<ResultBody>({
    method:
      "POST",

    url:
      "https://example.com/order",

    body: {
      dealId:
        1,
    },
  });

assert.equal(
  postResponse.status,
  503,
);

assert.equal(
  postClient.attempts,
  1,
);

const overrideClient =
  new SequenceClient([
    418,
    200,
  ]);

const overrideContexts:
  HttpRetryContext[] = [];

const overridePipeline =
  new MiddlewareHttpClient({
    client:
      overrideClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          1,

        baseDelayMs:
          0,

        maxDelayMs:
          0,

        shouldRetry:
          (
            context,
          ) => {
            overrideContexts.push(
              context,
            );

            return (
              context.response
                ?.status ===
              418
            );
          },
      }),
    ],
  });

const overrideResponse =
  await overridePipeline.request<ResultBody>({
    method:
      "GET",

    url:
      "https://example.com/custom",
  });

assert.equal(
  overrideResponse.status,
  200,
);

assert.equal(
  overrideClient.attempts,
  2,
);

assert.equal(
  overrideContexts.length,
  1,
);

const abortController =
  new AbortController();

const abortClient =
  new SequenceClient([
    503,
    200,
  ]);

const abortPipeline =
  new MiddlewareHttpClient({
    client:
      abortClient,

    middleware: [
      new HttpRetryMiddleware({
        maxRetries:
          1,

        baseDelayMs:
          10,

        maxDelayMs:
          10,

        sleep:
          async (
            _delayMs,
            signal,
          ) => {
            abortController.abort(
              new Error(
                "retry cancelled",
              ),
            );

            if (
              signal?.aborted
            ) {
              throw signal.reason;
            }
          },
      }),
    ],
  });

await assert.rejects(
  () =>
    abortPipeline.request({
      method:
        "GET",

      url:
        "https://example.com/abort",

      signal:
        abortController.signal,
    }),

  /retry cancelled/,
);

assert.equal(
  abortClient.attempts,
  1,
);

assert.throws(
  () =>
    new HttpRetryMiddleware({
      maxRetries:
        -1,
    }),

  /non-negative integer/,
);

assert.throws(
  () =>
    new HttpRetryMiddleware({
      baseDelayMs:
        100,

      maxDelayMs:
        50,
    }),

  /greater than or equal/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      statusAttempts:
        statusClient.attempts,

      networkAttempts:
        networkClient.attempts,

      exhaustedAttempts:
        exhaustedClient.attempts,

      postAttempts:
        postClient.attempts,

      abortAttempts:
        abortClient.attempts,
    },
    null,
    2,
  ),
);
