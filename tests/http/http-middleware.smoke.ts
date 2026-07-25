import assert from "node:assert/strict";

import {
  FunctionHttpMiddleware,
  MiddlewareHttpClient,
} from "../../lib/http";

import type {
  HttpClient,
  HttpMiddleware,
  HttpRequest,
  HttpResponse,
} from "../../lib/http";

interface ResultBody {
  ok: boolean;
  trace: string[];
}

const events:
  string[] = [];

class TerminalClient
  implements HttpClient {

  readonly requests:
    HttpRequest[] = [];

  async request<TBody = unknown>(
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
    events.push(
      "terminal",
    );

    this.requests.push(
      request,
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
        2,

      body: {
        ok:
          true,

        trace:
          [...events],
      } as TBody,
    };
  }
}

class HeaderMiddleware
  implements HttpMiddleware {

  async intercept<TBody = unknown>(
    request:
      HttpRequest,

    next:
      HttpClient,
  ): Promise<
    HttpResponse<TBody>
  > {
    events.push(
      "header:before",
    );

    const response =
      await next.request<TBody>({
        ...request,

        headers: {
          ...request.headers,

          "X-Pipeline":
            "enabled",
        },
      });

    events.push(
      "header:after",
    );

    return response;
  }
}

const queryMiddleware =
  new FunctionHttpMiddleware(
    async <TBody = unknown>(
      request:
        HttpRequest,

      next:
        HttpClient,
    ): Promise<
      HttpResponse<TBody>
    > => {
      events.push(
        "query:before",
      );

      const response =
        await next.request<TBody>({
          ...request,

          query: {
            ...request.query,

            source:
              "pipeline",
          },
        });

      events.push(
        "query:after",
      );

      return response;
    },
  );

const terminal =
  new TerminalClient();

const client =
  new MiddlewareHttpClient({
    client:
      terminal,

    middleware: [
      new HeaderMiddleware(),
      queryMiddleware,
    ],
  });

const originalRequest:
  HttpRequest = {

  method:
    "GET",

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
};

const response =
  await client.request<ResultBody>(
    originalRequest,
  );

assert.equal(
  response.body.ok,
  true,
);

assert.deepEqual(
  events,
  [
    "header:before",
    "query:before",
    "terminal",
    "query:after",
    "header:after",
  ],
);

assert.deepEqual(
  response.body.trace,
  [
    "header:before",
    "query:before",
    "terminal",
  ],
);

assert.equal(
  terminal.requests.length,
  1,
);

assert.equal(
  terminal.requests[0]
    ?.headers
    ?.["X-Pipeline"],
  "enabled",
);

assert.equal(
  terminal.requests[0]
    ?.query
    ?.source,
  "pipeline",
);

assert.equal(
  originalRequest
    .headers
    ?.["X-Pipeline"],
  undefined,
);

assert.equal(
  originalRequest
    .query
    ?.source,
  undefined,
);

const directClient =
  new MiddlewareHttpClient({
    client:
      terminal,
  });

await directClient.request({
  method:
    "GET",

  url:
    "https://example.com/direct",
});

assert.equal(
  terminal.requests.length,
  2,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      middleware:
        2,

      requests:
        terminal.requests.length,
    },
    null,
    2,
  ),
);
