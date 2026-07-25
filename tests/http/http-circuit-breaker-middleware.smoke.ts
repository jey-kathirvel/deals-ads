import assert from "node:assert/strict";

import {
  HttpCircuitBreakerMiddleware,
  HttpCircuitBreakerOpenError,
  MiddlewareHttpClient,
} from "../../lib/http";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
  HttpCircuitBreakerStateChange,
} from "../../lib/http";

interface TestBody {
  ok: boolean;
}

class SequenceClient
  implements HttpClient
{
  calls =
    0;

  constructor(
    private readonly handler:
      (
        request: HttpRequest,
        call: number,
      ) =>
        Promise<HttpResponse<unknown>>,
  ) {}

  async request<TBody = unknown>(
    request: HttpRequest,
  ): Promise<HttpResponse<TBody>> {
    this.calls +=
      1;

    return (
      await this.handler(
        request,
        this.calls,
      )
    ) as HttpResponse<TBody>;
  }
}

function successResponse(
  request: HttpRequest,
): HttpResponse<TestBody> {
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
      ok:
        true,
    },
  };
}

function failureResponse(
  request: HttpRequest,
): HttpResponse<TestBody> {
  return {
    status:
      503,
    statusText:
      "Service Unavailable",
    url:
      request.url,
    headers:
      {},
    durationMs:
      1,
    body: {
      ok:
        false,
    },
  };
}

const stateChanges:
  HttpCircuitBreakerStateChange[] = [];

const terminal =
  new SequenceClient(
    async (
      request,
      call,
    ) => {
      if (
        call <= 2
      ) {
        return failureResponse(
          request,
        );
      }

      return successResponse(
        request,
      );
    },
  );

const circuitBreaker =
  new HttpCircuitBreakerMiddleware({
    failureThreshold:
      2,
    resetTimeoutMs:
      25,
    successThreshold:
      1,
    onStateChange:
      (
        change,
      ) => {
        stateChanges.push(
          change,
        );
      },
  });

const client =
  new MiddlewareHttpClient({
    client:
      terminal,
    middleware: [
      circuitBreaker,
    ],
  });

const request:
  HttpRequest = {
    method:
      "GET",
    url:
      "https://example.com/deals",
    headers: {
      Accept:
        "application/json",
    },
  };

const first =
  await client.request<TestBody>(
    request,
  );

assert.equal(
  first.status,
  503,
);

assert.equal(
  circuitBreaker
    .getSnapshot()
    .state,
  "closed",
);

const second =
  await client.request<TestBody>(
    request,
  );

assert.equal(
  second.status,
  503,
);

assert.equal(
  circuitBreaker
    .getSnapshot()
    .state,
  "open",
);

await assert.rejects(
  () =>
    client.request(
      request,
    ),
  (
    error,
  ) =>
    error instanceof
      HttpCircuitBreakerOpenError &&
    error.snapshot.state ===
      "open",
);

assert.equal(
  terminal.calls,
  2,
);

await new Promise<void>(
  (
    resolve,
  ) => {
    setTimeout(
      resolve,
      35,
    );
  },
);

const recovery =
  await client.request<TestBody>(
    request,
  );

assert.equal(
  recovery.status,
  200,
);

assert.equal(
  circuitBreaker
    .getSnapshot()
    .state,
  "closed",
);

assert.deepEqual(
  stateChanges.map(
    (
      change,
    ) =>
      `${change.previousState}->${change.currentState}`,
  ),
  [
    "closed->open",
    "open->half-open",
    "half-open->closed",
  ],
);

assert.deepEqual(
  request,
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
);

const perProviderTerminal =
  new SequenceClient(
    async (
      request,
    ) => {
      if (
        request.headers?.["X-Provider"] ===
        "amazon"
      ) {
        throw new Error(
          "amazon unavailable",
        );
      }

      return successResponse(
        request,
      );
    },
  );

const perProviderBreaker =
  new HttpCircuitBreakerMiddleware({
    failureThreshold:
      1,
    resetTimeoutMs:
      1_000,
    keyProvider:
      (
        providerRequest,
      ) =>
        String(
          providerRequest.headers
            ?.["X-Provider"],
        ),
  });

const perProviderClient =
  new MiddlewareHttpClient({
    client:
      perProviderTerminal,
    middleware: [
      perProviderBreaker,
    ],
  });

await assert.rejects(
  () =>
    perProviderClient.request({
      method:
        "GET",
      url:
        "https://example.com/amazon",
      headers: {
        "X-Provider":
          "amazon",
      },
    }),
  /amazon unavailable/,
);

const flipkartResponse =
  await perProviderClient.request<TestBody>({
    method:
      "GET",
    url:
      "https://example.com/flipkart",
    headers: {
      "X-Provider":
        "flipkart",
    },
  });

assert.equal(
  flipkartResponse.status,
  200,
);

assert.equal(
  perProviderBreaker
    .getSnapshot("amazon")
    .state,
  "open",
);

assert.equal(
  perProviderBreaker
    .getSnapshot("flipkart")
    .state,
  "closed",
);

const ignoredFailureTerminal =
  new SequenceClient(
    async () => {
      throw new Error(
        "validation failure",
      );
    },
  );

const ignoredFailureBreaker =
  new HttpCircuitBreakerMiddleware({
    failureThreshold:
      1,
    resetTimeoutMs:
      100,
    shouldCountFailure:
      () =>
        false,
  });

const ignoredFailureClient =
  new MiddlewareHttpClient({
    client:
      ignoredFailureTerminal,
    middleware: [
      ignoredFailureBreaker,
    ],
  });

await assert.rejects(
  () =>
    ignoredFailureClient.request(
      request,
    ),
  /validation failure/,
);

assert.equal(
  ignoredFailureBreaker
    .getSnapshot()
    .state,
  "closed",
);

assert.throws(
  () =>
    new HttpCircuitBreakerMiddleware({
      failureThreshold:
        0,
      resetTimeoutMs:
        100,
    }),
  /positive integer/,
);

assert.throws(
  () =>
    new HttpCircuitBreakerMiddleware({
      failureThreshold:
        1,
      resetTimeoutMs:
        0,
    }),
  /greater than 0/,
);

assert.throws(
  () =>
    new HttpCircuitBreakerMiddleware({
      failureThreshold:
        1,
      resetTimeoutMs:
        100,
      successThreshold:
        0,
    }),
  /positive integer/,
);

assert.throws(
  () =>
    new HttpCircuitBreakerMiddleware({
      failureThreshold:
        1,
      resetTimeoutMs:
        100,
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
      new SequenceClient(
        async (
          emptyKeyRequest,
        ) =>
          successResponse(
            emptyKeyRequest,
          ),
      ),
    middleware: [
      new HttpCircuitBreakerMiddleware({
        failureThreshold:
          1,
        resetTimeoutMs:
          100,
        keyProvider:
          () =>
            "   ",
      }),
    ],
  });

await assert.rejects(
  () =>
    emptyKeyClient.request(
      request,
    ),
  /key cannot be empty/,
);

circuitBreaker.reset();

assert.equal(
  circuitBreaker
    .getSnapshot()
    .state,
  "closed",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",
      closed:
        true,
      open:
        true,
      halfOpen:
        true,
      recovery:
        true,
      perProvider:
        true,
      immutable:
        true,
    },
    null,
    2,
  ),
);
