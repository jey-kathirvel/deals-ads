import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Deals product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Best Online Deals &amp; Offers in India \| Deals\.ai/i);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /Smarter finds/);
  assert.match(html, /Brighter savings/);
  assert.match(html, /Shop by category/i);
  assert.match(html, /Prices may change at the retailer/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps the production page connected to durable deals", async () => {
  const [page, layout, store, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/deals-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /await getPublishedDeals\(\)/);
  assert.match(page, /<DealsApp/);
  assert.match(layout, /Deals/);
  assert.match(store, /getLegacyDeals/);
  assert.doesNotMatch(store, /searchParams\.set\(["']tag["']/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
