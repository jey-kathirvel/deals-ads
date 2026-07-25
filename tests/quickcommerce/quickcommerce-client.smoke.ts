import assert from "node:assert/strict";
import {
  QuickCommerceClient,
  QuickCommerceHttpError,
} from "../../lib/quickcommerce/client";

const requests: URL[] = [];
const client = new QuickCommerceClient({
  apiKey: "test-key",
  fetchImplementation: async (input) => {
    requests.push(new URL(String(input)));
    return Response.json({
      status: "success",
      data: {
        products: [{
          id: "item-1",
          name: "Test Product",
          brand: "Test",
          available: true,
          images: ["https://example.com/item.jpg"],
          mrp: 2000,
          offer_price: 1000,
          deeplink: "https://example.com/item-1",
          rating: 4.5,
          rating_count: 25,
          inventory: 4,
          rank: 1,
          platform: { name: "Example" },
        }],
      },
    });
  },
});

const products = await client.search({
  query: "test product",
  platform: "Example",
  latitude: 12.9,
  longitude: 77.6,
});

assert.equal(products.length, 1);
assert.equal(products[0]?.offerPrice, 1000);
assert.equal(products[0]?.images[0], "https://example.com/item.jpg");
assert.equal(requests[0]?.searchParams.get("q"), "test product");

const failingClient = new QuickCommerceClient({
  apiKey: "test-key",
  fetchImplementation: async () =>
    Response.json({ message: "not found" }, { status: 404 }),
});

await assert.rejects(
  failingClient.item({
    itemId: "missing",
    platform: "Example",
    latitude: 12.9,
    longitude: 77.6,
  }),
  (error: unknown) =>
    error instanceof QuickCommerceHttpError &&
    error.status === 404,
);

console.log(JSON.stringify({
  status: "passed",
  products: products.length,
  errorWrapping: true,
}, null, 2));
