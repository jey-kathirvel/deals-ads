import assert from "node:assert/strict";

import {
  ProviderResponseParseError,
  assertSuccessfulProviderResponse,
  createIdentityProviderResponseParser,
  createProviderResponseParser,
  requireProviderResponseBody,
} from "../../lib/providers";

import type {
  HttpResponse,
} from "../../lib/http";

interface RawSearchResponse {
  items: Array<{
    id: string;
    title: string;
  }>;
}

interface ParsedSearchResponse {
  deals: Array<{
    externalId: string;
    name: string;
  }>;
}

const context = {
  providerId:
    "amazon",

  operation:
    "search",
};

const successfulResponse:
  HttpResponse<RawSearchResponse> = {
    status:
      200,

    statusText:
      "OK",

    url:
      "https://api.example.com/search",

    headers:
      {},

    durationMs:
      12,

    body: {
      items: [
        {
          id:
            "deal-001",

          title:
            "Laptop Deal",
        },
      ],
    },
  };

const parser =
  createProviderResponseParser<
    RawSearchResponse,
    ParsedSearchResponse
  >({
    parseBody(
      body,
      response,
      parserContext,
    ) {
      assert.equal(
        response.status,
        200,
      );

      assert.equal(
        parserContext.providerId,
        "amazon",
      );

      return {
        deals:
          body.items.map(
            (
              item,
            ) => ({
              externalId:
                item.id,

              name:
                item.title,
            }),
          ),
      };
    },
  });

const parsed =
  await parser.parse(
    successfulResponse,
    context,
  );

assert.deepEqual(
  parsed,
  {
    deals: [
      {
        externalId:
          "deal-001",

        name:
          "Laptop Deal",
      },
    ],
  },
);

assertSuccessfulProviderResponse(
  successfulResponse,
  context,
);

assert.deepEqual(
  requireProviderResponseBody(
    successfulResponse,
    context,
  ),
  successfulResponse.body,
);

const identityParser =
  createIdentityProviderResponseParser<
    RawSearchResponse
  >();

const identityResult =
  await identityParser.parse(
    successfulResponse,
    context,
  );

assert.equal(
  identityResult,
  successfulResponse.body,
);

const createdResponse:
  HttpResponse<RawSearchResponse> = {
    ...successfulResponse,

    status:
      201,

    statusText:
      "Created",
  };

const customStatusParser =
  createIdentityProviderResponseParser<
    RawSearchResponse
  >({
    isSuccessfulStatus(
      status,
    ) {
      return (
        status === 200 ||
        status === 201
      );
    },
  });

assert.deepEqual(
  await customStatusParser.parse(
    createdResponse,
    context,
  ),
  createdResponse.body,
);

const failedResponse:
  HttpResponse<RawSearchResponse> = {
    ...successfulResponse,

    status:
      503,

    statusText:
      "Service Unavailable",
  };

await assert.rejects(async () => parser.parse(
      failedResponse,
      context,
    ),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderResponseParseError &&
    error.providerId ===
      "amazon" &&
    error.operation ===
      "search" &&
    error.status ===
      503,
);

const emptyResponse:
  HttpResponse<RawSearchResponse | undefined> = {
    ...successfulResponse,

    body:
      undefined,
  };

const requiredBodyParser =
  createIdentityProviderResponseParser<
    RawSearchResponse | undefined
  >();

await assert.rejects(
  async () =>
    requiredBodyParser.parse(
      emptyResponse,
      context,
    ),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderResponseParseError &&
    error.message.includes(
      "empty response body",
    ),
);

const allowEmptyParser =
  createProviderResponseParser<
    RawSearchResponse | undefined,
    boolean
  >({
    allowEmptyBody:
      true,

    parseBody(
      body,
    ) {
      return (
        body === undefined
      );
    },
  });

const allowEmptyResponse:
  HttpResponse<
    RawSearchResponse | undefined
  > = {
    ...successfulResponse,

    body:
      undefined,
  };

assert.equal(
  await allowEmptyParser.parse(
    allowEmptyResponse,
    context,
  ),
  true,
);

const throwingParser =
  createProviderResponseParser<
    RawSearchResponse,
    ParsedSearchResponse
  >({
    parseBody() {
      throw new Error(
        "invalid provider payload",
      );
    },
  });

await assert.rejects(async () => throwingParser.parse(
      successfulResponse,
      context,
    ),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderResponseParseError &&
    error.cause instanceof
      Error &&
    error.cause.message ===
      "invalid provider payload",
);

assert.throws(
  () =>
    assertSuccessfulProviderResponse(
      successfulResponse,
      {
        providerId:
          " ",

        operation:
          "search",
      },
    ),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderResponseParseError,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      successfulStatus:
        true,

      bodyValidation:
        true,

      mapping:
        true,

      customStatus:
        true,

      errorWrapping:
        true,
    },
    null,
    2,
  ),
);
