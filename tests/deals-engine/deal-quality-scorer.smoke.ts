import assert from "node:assert/strict";

import {
  DealQualityScorer,
} from "../../lib/deals-engine/quality/deal-quality-scorer";

const now =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const scorer =
  new DealQualityScorer({
    minimumPublishableScore: 70,
    now,
  });

const excellent =
  scorer.score({
    title:
      "Apple iPhone 16 128GB Smartphone",

    retailer:
      "Amazon India",

    category:
      "Mobiles",

    currentPrice:
      69999,

    originalPrice:
      79999,

    imageUrl:
      "https://example.com/iphone.jpg",

    url:
      "https://example.com/deals/iphone",

    expiresAt:
      "2026-07-27T00:00:00.000Z",
  });

assert.equal(
  excellent.score,
  100,
);

assert.equal(
  excellent.grade,
  "excellent",
);

assert.equal(
  excellent.publishable,
  true,
);

assert.equal(
  excellent.issues.length,
  0,
);

const invalid =
  scorer.score({
    title: "",
    retailer: "",
    category: "",
    currentPrice: -1,
    originalPrice: 0,
    discountPercentage: 0,
    imageUrl: "invalid-image",
    url: "javascript:alert(1)",
    expiresAt:
      "2026-07-24T00:00:00.000Z",
  });

assert.equal(
  invalid.score,
  0,
);

assert.equal(
  invalid.grade,
  "poor",
);

assert.equal(
  invalid.publishable,
  false,
);

assert.ok(
  invalid.issues.length >= 8,
);

const ranked =
  scorer.scoreMany([
    {
      title:
        "Low quality deal",
      retailer:
        "Example",
      category:
        "General",
      currentPrice:
        99,
      originalPrice:
        100,
      imageUrl:
        "https://example.com/low.jpg",
      url:
        "https://example.com/low",
      expiresAt:
        "2026-07-26T00:00:00.000Z",
    },
    {
      title:
        "High quality deal with strong discount",
      retailer:
        "Example",
      category:
        "General",
      currentPrice:
        70,
      originalPrice:
        100,
      imageUrl:
        "https://example.com/high.jpg",
      url:
        "https://example.com/high",
      expiresAt:
        "2026-07-26T00:00:00.000Z",
    },
  ]);

assert.equal(
  ranked.length,
  2,
);

assert.ok(
  ranked[0].quality.score >
  ranked[1].quality.score,
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      excellentScore:
        excellent.score,
      invalidScore:
        invalid.score,
      rankedScores:
        ranked.map(
          item =>
            item.quality.score,
        ),
    },
    null,
    2,
  ),
);
