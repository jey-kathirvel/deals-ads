import assert from "node:assert/strict";

import {
  ApiKeyHeaderAuthentication,
  ApiKeyQueryAuthentication,
  BasicAuthentication,
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

interface TestBody {
  ok: boolean;
}

class CaptureClient implements HttpClient {
  readonly requests: HttpRequest[] = [];

  async request<TBody = unknown>(
    request: HttpRequest,
  ): Promise<HttpResponse<TBody>> {
    this.requests.push(request);

    return {
      status: 200,
      statusText: "OK",
      url: request.url,
      headers: {},
      durationMs: 1,
      body: {
        ok: true,
      } as TBody,
    };
  }
}

async function runRegression(): Promise<void> {

  const terminal = new CaptureClient();

  const pipeline =
    new MiddlewareHttpClient({
      client: terminal,

      middleware: [
        new HttpAuthenticationMiddleware({
          strategies: [

            new ApiKeyHeaderAuthentication(
              new StaticCredentialProvider({
                apiKey: "header-secret",
              }),
            ),

            new ApiKeyQueryAuthentication(
              new StaticCredentialProvider({
                apiKey: "query-secret",
              }),
            ),

            new BearerAuthentication(
              new CallbackCredentialProvider(
                () => ({
                  token: "bearer-token",
                }),
              ),
            ),

            new BasicAuthentication(
              new StaticCredentialProvider({
                username: "john",
                password: "secret",
              }),
            ),
          ],
        }),
      ],
    });

  const original: HttpRequest = {
    method: "GET",
    url: "https://example.com/test",

    headers: {
      Accept: "application/json",
    },

    query: {
      page: 1,
    },
  };

  const response =
    await pipeline.request<TestBody>(
      original,
    );

  assert.equal(
    response.status,
    200,
  );

  assert.equal(
    response.body.ok,
    true,
  );

  assert.equal(
    terminal.requests.length,
    1,
  );

  const request =
    terminal.requests[0];

  assert.equal(
    request.headers?.Accept,
    "application/json",
  );

  assert.equal(
    request.headers?.["X-API-Key"],
    "header-secret",
  );

  assert.equal(
    request.query?.api_key,
    "query-secret",
  );

  assert.ok(
    String(
      request.headers?.Authorization,
    ).startsWith(
      "Basic ",
    ),
  );

  assert.equal(
    original.headers?.["X-API-Key"],
    undefined,
  );

  assert.equal(
    original.query?.api_key,
    undefined,
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        authentication: true,
        immutable: true,
      },
      null,
      2,
    ),
  );
}

await runRegression();
