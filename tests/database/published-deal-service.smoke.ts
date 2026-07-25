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
  PublishedDealService,
} from "../../lib/database/services";

const initialTime =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const transitionTime =
  new Date(
    "2026-07-25T06:00:00.000Z",
  );

function createDeal(
  id: string,
  overrides: Partial<DealRecord> = {},
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
      initialTime,

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
      initialTime,

    updatedAt:
      overrides.updatedAt ??
      initialTime,
  };
}

const repository =
  new InMemoryDealRepository();

await repository.createMany([
  createDeal(
    "deal-publish",
  ),

  createDeal(
    "deal-archive",
    {
      status:
        DealStatus.PUBLISHED,

      publishedAt:
        initialTime,
    },
  ),

  createDeal(
    "deal-expire",
    {
      status:
        DealStatus.PUBLISHED,

      publishedAt:
        initialTime,
    },
  ),

  createDeal(
    "deal-unchanged",
    {
      status:
        DealStatus.PUBLISHED,

      publishedAt:
        initialTime,
    },
  ),
]);

const service =
  new PublishedDealService(
    repository,
    {
      now:
        () =>
          new Date(
            transitionTime.getTime(),
          ),
    },
  );

const result =
  await service.applyTransitions({
    published: [
      {
        id:
          "deal-publish",
      },

      {
        id:
          "deal-unchanged",
      },

      {
        id:
          "deal-publish",
      },
    ],

    archived: [
      {
        id:
          "deal-archive",
      },
    ],

    expired: [
      {
        id:
          "deal-expire",
      },

      {
        id:
          "missing-deal",
      },
    ],
  });

assert.deepEqual(
  result,
  {
    published:
      1,

    archived:
      1,

    expired:
      1,

    unchanged:
      1,

    missing:
      1,
  },
);

const published =
  await repository.findById(
    "deal-publish",
  );

assert.equal(
  published?.status,
  DealStatus.PUBLISHED,
);

assert.equal(
  published?.publishedAt?.toISOString(),
  transitionTime.toISOString(),
);

assert.equal(
  published?.archivedAt,
  null,
);

const archived =
  await repository.findById(
    "deal-archive",
  );

assert.equal(
  archived?.status,
  DealStatus.ARCHIVED,
);

assert.equal(
  archived?.publishedAt?.toISOString(),
  initialTime.toISOString(),
);

assert.equal(
  archived?.archivedAt?.toISOString(),
  transitionTime.toISOString(),
);

const expired =
  await repository.findById(
    "deal-expire",
  );

assert.equal(
  expired?.status,
  DealStatus.EXPIRED,
);

assert.equal(
  expired?.archivedAt?.toISOString(),
  transitionTime.toISOString(),
);

const idempotent =
  await service.applyTransitions({
    published: [
      {
        id:
          "deal-publish",
      },
    ],

    archived: [
      {
        id:
          "deal-archive",
      },
    ],

    expired: [
      {
        id:
          "deal-expire",
      },
    ],
  });

assert.deepEqual(
  idempotent,
  {
    published:
      0,

    archived:
      0,

    expired:
      0,

    unchanged:
      3,

    missing:
      0,
  },
);

await assert.rejects(
  service.applyTransitions({
    published: [
      {
        id:
          "deal-publish",
      },
    ],

    archived: [
      {
        id:
          "deal-publish",
      },
    ],

    expired:
      [],
  }),

  /cannot be included in both/,
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      published:
        result.published,

      archived:
        result.archived,

      expired:
        result.expired,

      unchanged:
        result.unchanged,

      missing:
        result.missing,

      idempotent:
        true,

      conflictProtection:
        true,
    },
    null,
    2,
  ),
);
