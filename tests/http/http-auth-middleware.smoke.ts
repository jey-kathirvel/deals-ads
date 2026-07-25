import assert from "node:assert/strict";

import {
  ApiKeyHeaderAuthentication,
  ApiKeyQueryAuthentication,
  BearerAuthentication,
  CallbackCredentialProvider,
  HttpAuthenticationMiddleware,
  MiddlewareHttpClient,
  StaticCredentialProvider,
} from "../../lib/http";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../lib/http";

interface ResultBody {
  authenticated: boolean;
}

class CaptureClient
  implements HttpClient
{
  readonly requests:
    HttpRequest[] = [];

  async request<TBody = unknown>(
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
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
        1,

      body: {
        authenticated:
          true,
      } as TBody,
    };
  }
}

const terminal =
  new CaptureClient();

const contextProviders:
  string[] = [];

const client =
  new MiddlewareHttpClient({
    client:
      terminal,

    middleware: [
      new HttpAuthenticationMiddleware({
        strategies: [
          new ApiKeyHeaderAuthentication(
            new StaticCredentialProvider({
              apiKey:
                "header-secret",
            }),
            "X-Provider-Key",
          ),

          new ApiKeyQueryAuthentication(
            new StaticCredentialProvider({
              apiKey:
                "query-secret",
            }),
            "access_key",
          ),

          new BearerAuthentication(
            new CallbackCredentialProvider(
              async (
                context,
              ) => {
                contextProviders.push(
                  context?.provider ??
                  "missing",
                );

                return {
                  token:
                    `${context?.provider}-token`,
                };
              },
            ),
          ),
        ],

        contextProvider:
          async (
            request,
          ) => ({
            provider:
              request.headers
                ?.["X-Provider"] ===
              "amazon"
                ? "amazon"
                : "unknown",
          }),
      }),
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

      "X-Provider":
        "amazon",

      Authorization:
        "Bearer old-token",
    },

    query: {
      page:
        1,

      access_key:
        "old-query-secret",
    },
  };

const response =
  await client.request<ResultBody>(
    originalRequest,
  );

assert.equal(
  response.status,
  200,
);

assert.equal(
  response.body.authenticated,
  true,
);

assert.equal(
  terminal.requests.length,
  1,
);

const authenticatedRequest =
  terminal.requests[0];

assert.equal(
  authenticatedRequest
    ?.headers
    ?.Accept,
  "application/json",
);

assert.equal(
  authenticatedRequest
    ?.headers
    ?.["X-Provider-Key"],
  "header-secret",
);

assert.equal(
  authenticatedRequest
    ?.headers
    ?.Authorization,
  "Bearer amazon-token",
);

assert.equal(
  authenticatedRequest
    ?.query
    ?.page,
  1,
);

assert.equal(
  authenticatedRequest
    ?.query
    ?.access_key,
  "query-secret",
);

assert.deepEqual(
  contextProviders,
  [
    "amazon",
  ],
);

assert.equal(
  originalRequest
    .headers
    ?.["X-Provider-Key"],
  undefined,
);

assert.equal(
  originalRequest
    .headers
    ?.Authorization,
  "Bearer old-token",
);

assert.equal(
  originalRequest
    .query
    ?.access_key,
  "old-query-secret",
);

const staticContextTerminal =
  new CaptureClient();

const staticContextClient =
  new MiddlewareHttpClient({
    client:
      staticContextTerminal,

    middleware: [
      new HttpAuthenticationMiddleware({
        strategies: [
          new BearerAuthentication(
            new CallbackCredentialProvider(
              (
                context,
              ) => ({
                token:
                  `${context?.provider}-static`,
              }),
            ),
          ),
        ],

        context: {
          provider:
            "flipkart",
        },
      }),
    ],
  });

await staticContextClient.request({
  method:
    "GET",

  url:
    "https://example.com/products",
});

assert.equal(
  staticContextTerminal
    .requests[0]
    ?.headers
    ?.Authorization,
  "Bearer flipkart-static",
);

const compositionTerminal =
  new CaptureClient();

const compositionClient =
  new MiddlewareHttpClient({
    client:
      compositionTerminal,

    middleware: [
      new HttpAuthenticationMiddleware({
        strategies: [
          new ApiKeyHeaderAuthentication(
            new StaticCredentialProvider({
              apiKey:
                "first",
            }),
            "X-Shared-Key",
          ),

          new ApiKeyHeaderAuthentication(
            new StaticCredentialProvider({
              apiKey:
                "second",
            }),
            "X-Shared-Key",
          ),
        ],
      }),
    ],
  });

await compositionClient.request({
  method:
    "GET",

  url:
    "https://example.com/composition",
});

assert.equal(
  compositionTerminal
    .requests[0]
    ?.headers
    ?.["X-Shared-Key"],
  "second",
);

assert.throws(
  () =>
    new HttpAuthenticationMiddleware({
      strategies:
        [],
    }),

  /requires at least one strategy/,
);

assert.throws(
  () =>
    new HttpAuthenticationMiddleware({
      strategies: [
        new BearerAuthentication(
          new StaticCredentialProvider({
            token:
              "token",
          }),
        ),
      ],

      context: {
        provider:
          "amazon",
      },

      contextProvider:
        () => ({
          provider:
            "flipkart",
        }),
    }),

  /cannot use both context and contextProvider/,
);

console.log(
  "PATCH-006B.3.2: PASSED",
);
