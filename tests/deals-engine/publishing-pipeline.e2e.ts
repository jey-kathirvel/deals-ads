import assert from "node:assert/strict";

import {
  DealQualityScorer,
  ImageQualityValidator,
  RetailPriceSanityValidator,
} from "../../lib/deals-engine/quality";

import {
  DailyRotationEngine,
  DealExpiryManager,
  PublishPipeline,
  PublishQueue,
} from "../../lib/deals-engine/publish";

import type {
  DealQualityResult,
} from "../../lib/deals-engine/quality";

import type {
  PublishPipelineDeal,
} from "../../lib/deals-engine/publish";

const now =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const qualityScorer =
  new DealQualityScorer({
    minimumPublishableScore: 70,
    now,
  });

const imageValidator =
  new ImageQualityValidator();

const priceValidator =
  new RetailPriceSanityValidator({
    supportedCurrencies: [
      "INR",
    ],
  });

const pipeline =
  new PublishPipeline(
    new PublishQueue({
      minimumScore: 70,
      maximumQueueSize: 120,
    }),

    new DealExpiryManager({
      now,
      expiringSoonHours: 24,
    }),

    new DailyRotationEngine({
      maximumActiveDeals: 100,
    }),
  );

interface RawDeal {
  id: string;
  title: string;
  retailer: string;
  category: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  currency: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageMimeType: string;
  imageSizeBytes: number;
  url: string;
  expiresAt: string;
  discoveredAt: string;
  rankingScore: number;
}

function prepareDeal(
  raw: RawDeal,
): PublishPipelineDeal {
  const imageQuality =
    imageValidator.validate({
      imageUrl:
        raw.imageUrl,

      width:
        raw.imageWidth,

      height:
        raw.imageHeight,

      mimeType:
        raw.imageMimeType,

      sizeBytes:
        raw.imageSizeBytes,
    });

  const priceQuality =
    priceValidator.validate({
      currentPrice:
        raw.currentPrice,

      originalPrice:
        raw.originalPrice,

      discountPercentage:
        raw.discountPercentage,

      currency:
        raw.currency,
    });

  const baseQuality =
    qualityScorer.score({
      title:
        raw.title,

      retailer:
        raw.retailer,

      category:
        raw.category,

      currentPrice:
        raw.currentPrice,

      originalPrice:
        raw.originalPrice,

      discountPercentage:
        raw.discountPercentage,

      imageUrl:
        raw.imageUrl,

      url:
        raw.url,

      expiresAt:
        raw.expiresAt,
    });

  const publishable =
    baseQuality.publishable &&
    imageQuality.valid &&
    priceQuality.valid;

  const compositeScore =
    Math.min(
      baseQuality.score,
      imageQuality.score,
      priceQuality.score,
      raw.rankingScore,
    );

  const quality: DealQualityResult = {
    ...baseQuality,

    score:
      compositeScore,

    publishable,

    issues: [
      ...baseQuality.issues,

      ...imageQuality.issues.map(
        issue => ({
          code:
            `image_${issue.code}`,

          field:
            "imageUrl" as const,

          message:
            issue.message,

          penalty:
            0,
        }),
      ),

      ...priceQuality.issues.map(
        issue => ({
          code:
            `price_${issue.code}`,

          field:
            (
              issue.field === "currency"
                ? "currentPrice"
                : issue.field
            ) as
              | "currentPrice"
              | "originalPrice"
              | "discountPercentage",

          message:
            issue.message,

          penalty:
            0,
        }),
      ),
    ],
  };

  return {
    id:
      raw.id,

    score:
      compositeScore,

    discoveredAt:
      raw.discoveredAt,

    retailer:
      raw.retailer,

    expiresAt:
      raw.expiresAt,

    quality,
  };
}

const rawDeals: RawDeal[] = [];

for (
  let index = 1;
  index <= 110;
  index += 1
) {
  const paddedId =
    String(index).padStart(
      3,
      "0",
    );

  rawDeals.push({
    id:
      `deal-${paddedId}`,

    title:
      `Verified deal product number ${paddedId}`,

    retailer:
      index % 2 === 0
        ? "Amazon India"
        : "Flipkart",

    category:
      "Electronics",

    currentPrice:
      800,

    originalPrice:
      1000,

    discountPercentage:
      20,

    currency:
      "INR",

    imageUrl:
      `https://images.example.com/${paddedId}.jpg`,

    imageWidth:
      1200,

    imageHeight:
      800,

    imageMimeType:
      "image/jpeg",

    imageSizeBytes:
      500_000,

    url:
      `https://deals.example.com/${paddedId}`,

    expiresAt:
      "2026-07-30T00:00:00.000Z",

    discoveredAt:
      new Date(
        Date.UTC(
          2026,
          6,
          25,
          0,
          index,
          0,
        ),
      ).toISOString(),

    rankingScore:
      Number(
        (
          100 -
          index / 100
        ).toFixed(2),
      ),
  });
}

rawDeals.push({
  id:
    "invalid-image",

  title:
    "Deal with invalid product image",

  retailer:
    "Amazon India",

  category:
    "Electronics",

  currentPrice:
    800,

  originalPrice:
    1000,

  discountPercentage:
    20,

  currency:
    "INR",

  imageUrl:
    "ftp://example.com/product.bmp",

  imageWidth:
    100,

  imageHeight:
    100,

  imageMimeType:
    "image/bmp",

  imageSizeBytes:
    8 * 1024 * 1024,

  url:
    "https://deals.example.com/invalid-image",

  expiresAt:
    "2026-07-30T00:00:00.000Z",

  discoveredAt:
    "2026-07-25T05:00:00.000Z",

  rankingScore:
    99,
});

rawDeals.push({
  id:
    "invalid-price",

  title:
    "Deal with mismatched retail pricing",

  retailer:
    "Flipkart",

  category:
    "Electronics",

  currentPrice:
    500,

  originalPrice:
    1000,

  discountPercentage:
    20,

  currency:
    "INR",

  imageUrl:
    "https://images.example.com/invalid-price.jpg",

  imageWidth:
    1200,

  imageHeight:
    800,

  imageMimeType:
    "image/jpeg",

  imageSizeBytes:
    500_000,

  url:
    "https://deals.example.com/invalid-price",

  expiresAt:
    "2026-07-30T00:00:00.000Z",

  discoveredAt:
    "2026-07-25T05:01:00.000Z",

  rankingScore:
    99,
});

rawDeals.push({
  id:
    "expired-deal",

  title:
    "High quality deal that has expired",

  retailer:
    "Amazon India",

  category:
    "Electronics",

  currentPrice:
    800,

  originalPrice:
    1000,

  discountPercentage:
    20,

  currency:
    "INR",

  imageUrl:
    "https://images.example.com/expired.jpg",

  imageWidth:
    1200,

  imageHeight:
    800,

  imageMimeType:
    "image/jpeg",

  imageSizeBytes:
    500_000,

  url:
    "https://deals.example.com/expired",

  expiresAt:
    "2026-07-24T00:00:00.000Z",

  discoveredAt:
    "2026-07-24T05:00:00.000Z",

  rankingScore:
    99,
});

const preparedDeals =
  rawDeals.map(
    prepareDeal,
  );

const invalidImage =
  preparedDeals.find(
    deal =>
      deal.id ===
      "invalid-image",
  );

const invalidPrice =
  preparedDeals.find(
    deal =>
      deal.id ===
      "invalid-price",
  );

const expiredDeal =
  preparedDeals.find(
    deal =>
      deal.id ===
      "expired-deal",
  );

assert.ok(
  invalidImage,
);

assert.ok(
  invalidPrice,
);

assert.ok(
  expiredDeal,
);

assert.equal(
  invalidImage.quality.publishable,
  false,
);

assert.ok(
  invalidImage.quality.issues.some(
    issue =>
      issue.code.startsWith(
        "image_",
      ),
  ),
);

assert.equal(
  invalidPrice.quality.publishable,
  false,
);

assert.ok(
  invalidPrice.quality.issues.some(
    issue =>
      issue.code ===
      "price_discount_mismatch",
  ),
);

/*
 * Quality scoring validates deal content.
 * Expiry is handled independently by DealExpiryManager
 * inside PublishPipeline.
 */
assert.equal(
  expiredDeal.quality.publishable,
  true,
);

const result =
  pipeline.run(
    preparedDeals,
  );

assert.equal(
  preparedDeals.length,
  113,
);

assert.equal(
  result.published.length,
  100,
);

assert.equal(
  result.archived.length,
  12,
);

assert.equal(
  result.expired.length,
  1,
);

assert.equal(
  result.published[0].id,
  "deal-001",
);

assert.equal(
  result.published[99].id,
  "deal-100",
);

assert.ok(
  result.archived.some(
    deal =>
      deal.id ===
      "deal-101",
  ),
);

assert.ok(
  result.archived.some(
    deal =>
      deal.id ===
      "invalid-image",
  ),
);

assert.ok(
  result.archived.some(
    deal =>
      deal.id ===
      "invalid-price",
  ),
);

assert.equal(
  result.expired[0].id,
  "expired-deal",
);

assert.ok(
  result.published.every(
    deal =>
      deal.quality.publishable,
  ),
);

assert.ok(
  result.published.every(
    deal =>
      new Date(
        deal.expiresAt!,
      ).getTime() >
      now.getTime(),
  ),
);

assert.equal(
  new Set(
    result.published.map(
      deal =>
        deal.id,
    ),
  ).size,
  result.published.length,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      totalInput:
        preparedDeals.length,

      published:
        result.published.length,

      archived:
        result.archived.length,

      expired:
        result.expired.length,

      highestPriority:
        result.published[0].id,

      lowestPublishedPriority:
        result.published.at(-1)?.id,

      firstRotatedOut:
        result.archived.find(
          deal =>
            deal.id.startsWith(
              "deal-",
            ),
        )?.id,
    },
    null,
    2,
  ),
);
