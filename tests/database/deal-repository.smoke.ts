import assert from "node:assert/strict";

import {
  DealSource,
  DealStatus,
} from "../../lib/database/models";

import {
  InMemoryDealRepository,
} from "../../lib/database/repositories";

import type {
  DealRecord,
} from "../../lib/database/models";

const now =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

function createDeal(
  overrides: Partial<DealRecord> = {},
): DealRecord {
  const id =
    overrides.id ??
    "deal-001";

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
      DealStatus.DISCOVERED,

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
        "2026-07-30T00:00:00.000Z",
      ),

    publishedAt:
      overrides.publishedAt ??
      null,

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
  createDeal({
    id:
      "deal-001",

    externalId:
      "amazon-001",

    score:
      95,

    discountPercentage:
      25,
  }),

  createDeal({
    id:
      "deal-002",

    externalId:
      "flipkart-001",

    source:
      DealSource.FLIPKART,

    status:
      DealStatus.PUBLISHED,

    score:
      88,

    discountPercentage:
      30,

    publishedAt:
      now,
  }),

  createDeal({
    id:
      "deal-003",

    externalId:
      "amazon-003",

    category:
      "Home Appliances",

    score:
      72,

    discountPercentage:
      15,
  }),
]);

assert.equal(
  await repository.count(),
  3,
);

assert.equal(
  await repository.existsByExternalId(
    DealSource.AMAZON,
    "amazon-001",
  ),
  true,
);

const found =
  await repository.findByExternalId(
    DealSource.FLIPKART,
    "flipkart-001",
  );

assert.equal(
  found?.id,
  "deal-002",
);

const published =
  await repository.findMany({
    status:
      DealStatus.PUBLISHED,

    limit:
      10,
  });

assert.equal(
  published.total,
  1,
);

assert.equal(
  published.items[0].id,
  "deal-002",
);

const highDiscount =
  await repository.findMany({
    minimumDiscountPercentage:
      20,

    sort: {
      field:
        "score",

      direction:
        "desc",
    },
  });

assert.equal(
  highDiscount.total,
  2,
);

assert.deepEqual(
  highDiscount.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-001",
    "deal-002",
  ],
);

const paginated =
  await repository.findMany({
    limit:
      1,

    offset:
      1,

    sort: {
      field:
        "score",

      direction:
        "desc",
    },
  });

assert.equal(
  paginated.total,
  3,
);

assert.equal(
  paginated.items.length,
  1,
);

assert.equal(
  paginated.items[0].id,
  "deal-002",
);

const updated =
  await repository.update(
    "deal-001",
    {
      status:
        DealStatus.PUBLISHED,

      publishedAt:
        new Date(
          "2026-07-25T01:00:00.000Z",
        ),

      updatedAt:
        new Date(
          "2026-07-25T01:00:00.000Z",
        ),
    },
  );

assert.equal(
  updated?.status,
  DealStatus.PUBLISHED,
);

assert.equal(
  await repository.count({
    status:
      DealStatus.PUBLISHED,
  }),
  2,
);

const deleted =
  await repository.delete(
    "deal-003",
  );

assert.equal(
  deleted,
  true,
);

assert.equal(
  await repository.count(),
  2,
);

await assert.rejects(
  repository.create(
    createDeal({
      id:
        "deal-004",

      externalId:
        "amazon-001",
    }),
  ),

  /already exists/,
);

const mutationCheck =
  await repository.findById(
    "deal-001",
  );

assert.ok(
  mutationCheck,
);

mutationCheck.title =
  "Mutated outside repository";

const persistedCheck =
  await repository.findById(
    "deal-001",
  );

assert.notEqual(
  persistedCheck?.title,
  "Mutated outside repository",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      total:
        await repository.count(),

      published:
        await repository.count({
          status:
            DealStatus.PUBLISHED,
        }),

      duplicateProtection:
        true,

      defensiveCloning:
        true,
    },
    null,
    2,
  ),
);
