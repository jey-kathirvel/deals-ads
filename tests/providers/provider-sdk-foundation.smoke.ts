import assert from "node:assert/strict";

import {
  GenericProviderSdk,
} from "../../lib/providers";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../lib/http";

class FakeHttpClient
  implements HttpClient
{
  requests:
    HttpRequest[] =
    [];

  async request<T>(
    request: HttpRequest,
  ): Promise<
    HttpResponse<T>
  > {
    this.requests.push(
      request,
    );

    return {
      status: 200,
      statusText: "OK",
      url: request.url,
      headers: {},
      durationMs: 5,
      body: {
        ok: true,
      } as T,
    };
  }
}

const client =
  new FakeHttpClient();

const sdk =
  new GenericProviderSdk(
    {
      providerId:
        "amazon",

      providerName:
        "Amazon",

      providerVersion:
        "v1",

      httpClient:
        client,
    },

    (
      request,
    ) => ({
      method:
        "GET",

      url:
        `https://example.com/${request.operation}`,

      headers: {
        Accept:
          "application/json",
      },
    }),
  );

const result =
  await sdk.execute({
    operation:
      "search",

    options: {},
  });

assert.equal(
  result.providerId,
  "amazon",
);

assert.equal(
  result.operation,
  "search",
);

assert.equal(
  result.response.status,
  200,
);

assert.equal(
  client.requests.length,
  1,
);

assert.equal(
  client.requests[0].url,
  "https://example.com/search",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",
      providerSdk:
        true,
    },
    null,
    2,
  ),
);
