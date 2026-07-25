import assert from "node:assert/strict";
import {
  createServer,
} from "node:http";

import {
  FetchHttpClient,
  HttpTimeoutError,
} from "../../lib/http";

const server =
  createServer(
    (
      req,
      res,
    ) => {

      if (
        req.url?.startsWith(
          "/json",
        )
      ) {

        res.setHeader(
          "Content-Type",
          "application/json",
        );

        res.end(
          JSON.stringify({
            ok:true,
          }),
        );

        return;
      }

      if (
        req.url?.startsWith(
          "/delay",
        )
      ) {

        setTimeout(
          () => {
            res.end(
              "slow",
            );
          },
          200,
        );

        return;
      }

      res.end(
        "hello",
      );

    },
  );

await new Promise<void>(
  resolve =>
    server.listen(
      0,
      resolve,
    ),
);

const address =
  server.address();

if (
  !address ||
  typeof address === "string"
) {
  throw new Error(
    "Unable to start server",
  );
}

const base =
  `http://127.0.0.1:${address.port}`;

const client =
  new FetchHttpClient({
    defaults:{
      timeoutMs:1000,
      userAgent:"deals-ads-test",
    },
  });

const text =
  await client.request<string>({
    method:"GET",
    url:`${base}/`,
  });

assert.equal(
  text.body,
  "hello",
);

const json =
  await client.request<{
    ok:boolean;
  }>({
    method:"GET",
    url:`${base}/json`,
  });

assert.equal(
  json.body.ok,
  true,
);

await assert.rejects(
  () =>
    client.request({
      method:"GET",
      url:`${base}/delay`,
      timeoutMs:50,
    }),
  HttpTimeoutError,
);

server.close();

console.log(
  JSON.stringify(
    {
      status:"passed",
      requests:3,
    },
    null,
    2,
  ),
);
