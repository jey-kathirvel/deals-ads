import assert from "node:assert/strict";

import {
  ApiKeyHeaderAuthentication,
  ApiKeyQueryAuthentication,
  BasicAuthentication,
  BearerAuthentication,
  CallbackCredentialProvider,
  StaticCredentialProvider,
} from "../../lib/http";

const apiHeader =
  new ApiKeyHeaderAuthentication(
    new StaticCredentialProvider({
      apiKey: "abc123",
    }),
  );

const apiHeaderResult =
  await apiHeader.authenticate();

assert.equal(
  apiHeaderResult.headers?.["X-API-Key"],
  "abc123",
);

const apiQuery =
  new ApiKeyQueryAuthentication(
    new StaticCredentialProvider({
      apiKey: "xyz789",
    }),
  );

const apiQueryResult =
  await apiQuery.authenticate();

assert.equal(
  apiQueryResult.query?.api_key,
  "xyz789",
);

const bearer =
  new BearerAuthentication(
    new StaticCredentialProvider({
      token: "token-001",
    }),
  );

const bearerResult =
  await bearer.authenticate();

assert.equal(
  bearerResult.headers?.Authorization,
  "Bearer token-001",
);

const basic =
  new BasicAuthentication(
    new StaticCredentialProvider({
      username: "john",
      password: "secret",
    }),
  );

const basicResult =
  await basic.authenticate();

assert.ok(
  basicResult.headers?.Authorization?.startsWith(
    "Basic ",
  ),
);

const callback =
  new CallbackCredentialProvider(
    async () => ({
      token: "dynamic-token",
    }),
  );

const callbackBearer =
  new BearerAuthentication(
    callback,
  );

const callbackResult =
  await callbackBearer.authenticate();

assert.equal(
  callbackResult.headers?.Authorization,
  "Bearer dynamic-token",
);

console.log(
  "PATCH-006B.3.1: PASSED",
);
