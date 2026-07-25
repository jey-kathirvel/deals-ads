import assert from "node:assert/strict";

import {
  DealSource,
  DealStatus,
} from "../../lib/database/models";

import type {
  DealRecord,
} from "../../lib/database/models";

import {
  InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
  DealsApi,
} from "../../lib/api";

const now =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

function createDeal(
  id: string,
  overrides:
    Partial<DealRecord> = {},
): DealRecord {
  return {
    id,

    externalId:
      overrides.externalId ??
      `external-${id}`,

    source:
      overrides.source ??
      DealSource.AMAZON,

    status:
      overrides.status ??
      DealStatus.PUBLISHED,

    title:
      overrides.title ??
      `Product ${id}`,

    url:
      overrides.url ??
      `https://example.com/${id}`,

    imageUrl:
      overrides.imageUrl ??
      `https://images.example.com/${id}.jpg`,

    category:
      overrides.category ??
      "Electronics",

    currency:
      overrides.currency ??
      "INR",

    currentPrice:
      overrides.currentPrice ??
      800,

    originalPrice:
      overrides.originalPrice ??
      1000,

    discountPercentage:
      overrides.discountPercentage ??
      20,

    score:
      overrides.score ??
      90,

    discoveredAt:
      overrides.discoveredAt ??
      now,

    expiresAt:
      overrides.expiresAt ??
      new Date(
        "2026-08-01T00:00:00.000Z",
      ),

    publishedAt:
      overrides.publishedAt ??
      now,

    archivedAt:
      overrides.archivedAt ??
      null,

    createdAt:
      overrides.createdAt ??
      now,

    updatedAt:
      overrides.updatedAt ??
      now,
  };
}

const repository =
  new InMemoryDealRepository();

await repository.createMany([
  createDeal(
    "deal-001",
    {
      title:
        "Premium Smartphone",

      source:
        DealSource.AMAZON,

      category:
        "Electronics",

      currentPrice:
        700,

      discountPercentage:
        30,

      score:
        95,

      expiresAt:
        new Date(
          "2026-07-30T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-002",
    {
      title:
        "Gaming Laptop",

      source:
        DealSource.FLIPKART,

      category:
        "Electronics",

      currentPrice:
        1500,

      discountPercentage:
        25,

      score:
        88,

      expiresAt:
        new Date(
          "2026-07-31T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-003",
    {
      title:
        "Kitchen Mixer",

      source:
        DealSource.AMAZON,

      category:
        "Home Appliances",

      currentPrice:
        300,

      discountPercentage:
        40,

      score:
        82,

      expiresAt:
        new Date(
          "2026-08-02T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-004",
    {
      title:
        "Budget Smartphone",

      source:
        DealSource.FLIPKART,

      category:
        "Electronics",

      currentPrice:
        400,

      discountPercentage:
        15,

      score:
        75,

      expiresAt:
        new Date(
          "2026-08-05T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-005",
    {
      title:
        "Archived Smartphone",

      source:
        DealSource.AMAZON,

      status:
        DealStatus.ARCHIVED,

      category:
        "Electronics",

      currentPrice:
        350,

      discountPercentage:
        45,

      score:
        98,

      publishedAt:
        new Date(
          "2026-07-01T00:00:00.000Z",
        ),

      archivedAt:
        new Date(
          "2026-07-20T00:00:00.000Z",
        ),
    },
  ),
]);

const api =
  new DealsApi(
    repository,
    {
      defaultLimit:
        2,

      maximumLimit:
        3,

      defaultStatus:
        DealStatus.PUBLISHED,
    },
  );

const firstPage =
  await api.listDeals({
    category:
      "Electronics",

    minimumScore:
      70,

    sortBy:
      "currentPrice",

    sortDirection:
      "asc",

    limit:
      2,
  });

assert.equal(
  firstPage.total,
  3,
);

assert.deepEqual(
  firstPage.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-004",
    "deal-001",
  ],
);

assert.equal(
  firstPage.hasNextPage,
  true,
);

assert.equal(
  firstPage.hasPreviousPage,
  false,
);

const secondPage =
  await api.listDeals({
    category:
      "Electronics",

    minimumScore:
      70,

    sortBy:
      "currentPrice",

    sortDirection:
      "asc",

    limit:
      2,

    offset:
      2,
  });

assert.deepEqual(
  secondPage.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-002",
  ],
);

assert.equal(
  secondPage.hasNextPage,
  false,
);

assert.equal(
  secondPage.hasPreviousPage,
  true,
);

const sourceFilter =
  await api.listDeals({
    source:
      DealSource.FLIPKART,

    sortBy:
      "score",

    sortDirection:
      "desc",
  });

assert.deepEqual(
  sourceFilter.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-002",
    "deal-004",
  ],
);

const searchResult =
  await api.listDeals({
    searchText:
      "smartphone",

    sortBy:
      "score",

    sortDirection:
      "desc",
  });

assert.deepEqual(
  searchResult.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-001",
    "deal-004",
  ],
);

const expiryResult =
  await api.listDeals({
    expiresAfter:
      "2026-07-30T12:00:00.000Z",

    expiresBefore:
      "2026-08-03T00:00:00.000Z",

    sortBy:
      "expiresAt" as never,
  }).catch(
    error =>
      error as Error,
  );

assert.ok(
  expiryResult instanceof Error,
);

assert.match(
  expiryResult.message,
  /Unsupported sort field/,
);

const validExpiryResult =
  await api.listDeals({
    expiresAfter:
      "2026-07-30T12:00:00.000Z",

    expiresBefore:
      "2026-08-03T00:00:00.000Z",

    sortBy:
      "score",

    sortDirection:
      "desc",
  });

assert.deepEqual(
  validExpiryResult.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-002",
    "deal-003",
  ],
);

const archived =
  await api.listDeals({
    status:
      DealStatus.ARCHIVED,
  });

assert.equal(
  archived.total,
  1,
);

assert.equal(
  archived.items[0].id,
  "deal-005",
);

const capped =
  await api.listDeals({
    status:
      DealStatus.PUBLISHED,

    limit:
      1000,
  });

assert.equal(
  capped.limit,
  3,
);

await assert.rejects(
  api.listDeals({
    minimumScore:
      101,
  }),

  /between 0 and 100/,
);

await assert.rejects(
  api.listDeals({
    expiresAfter:
      "invalid-date",
  }),

  /must be a valid date/,
);

await assert.rejects(
  api.listDeals({
    expiresAfter:
      "2026-08-02T00:00:00.000Z",

    expiresBefore:
      "2026-08-01T00:00:00.000Z",
  }),

  /must be earlier/,
);

await assert.rejects(
  api.getDeal(
    "   ",
  ),

  /cannot be empty/,
);

const metadata =
  api.metadata();

assert.equal(
  metadata.defaultLimit,
  2,
);

assert.equal(
  metadata.maximumLimit,
  3,
);

assert.ok(
  metadata.statuses.includes(
    DealStatus.PUBLISHED,
  ),
);

assert.ok(
  metadata.sources.includes(
    DealSource.AMAZON,
  ),
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      filteredTotal:
        firstPage.total,

      firstPage:
        firstPage.items.map(
          deal =>
            deal.id,
        ),

      secondPage:
        secondPage.items.map(
          deal =>
            deal.id,
        ),

      searchMatches:
        searchResult.items.length,

      sourceMatches:
        sourceFilter.items.length,

      expiryMatches:
        validExpiryResult.items.length,

      maximumLimit:
        metadata.maximumLimit,
    },
    null,
    2,
  ),
);
