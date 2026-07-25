import assert from "node:assert/strict";

import {
  HttpRequestBuilder,
  HttpService,
} from "../../lib/http";

import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../lib/http";

interface SuccessBody {
  success: boolean;
}

class FakeClient
  implements HttpClient {
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
        success:
          true,
      } as TBody,
    };
  }
}

const fake =
  new FakeClient();

const service =
  new HttpService({
    client:
      fake,
  });

const getResult =
  await service.get<SuccessBody>(
    "https://example.com/get",
  );

assert.equal(
  getResult.body.success,
  true,
);

const postResult =
  await service.post<SuccessBody>(
    "https://example.com/post",
    {
      hello:
        "world",
    },
  );

assert.equal(
  postResult.body.success,
  true,
);

await service.request<SuccessBody>(
  HttpRequestBuilder
    .get(
      "https://example.com/custom",
    )
    .header(
      "Accept",
      "application/json",
    )
    .build(),
);

assert.equal(
  fake.requests.length,
  3,
);

assert.equal(
  fake.requests[0]?.method,
  "GET",
);

assert.equal(
  fake.requests[1]?.method,
  "POST",
);

assert.deepEqual(
  fake.requests[1]?.body,
  {
    hello:
      "world",
  },
);

assert.equal(
  fake.requests[2]?.headers?.Accept,
  "application/json",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      requests:
        fake.requests.length,
    },
    null,
    2,
  ),
);
