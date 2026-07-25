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
  CleanupService,
  DiscoveryPersistenceService,
  DuplicateDetectionService,
  PublishedDealService,
  SchedulerJobStatus,
  SchedulerQueueService,
} from "../../lib/database/services";

import {
  DealsApi,
} from "../../lib/api";

const initialTime =
  new Date(
    "2026-07-25T00:00:00.000Z",
  );

const publishTime =
  new Date(
    "2026-07-25T02:00:00.000Z",
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
        "2026-08-01T00:00:00.000Z",
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

const duplicateDetection =
  new DuplicateDetectionService(
    repository,
  );

const discoveryPersistence =
  new DiscoveryPersistenceService(
    repository,
  );

const publishedDealService =
  new PublishedDealService(
    repository,
    {
      now:
        () =>
          new Date(
            publishTime.getTime(),
          ),
    },
  );

const cleanupService =
  new CleanupService(
    repository,
  );

const schedulerQueue =
  new SchedulerQueueService();

const dealsApi =
  new DealsApi(
    repository,
    {
      defaultLimit:
        10,

      maximumLimit:
        100,

      defaultStatus:
        DealStatus.PUBLISHED,
    },
  );

/*
 * STEP 1:
 * Seed a previously discovered deal.
 */
await repository.create(
  createDeal(
    "existing-deal",
    {
      externalId:
        "amazon-existing",

      score:
        75,
    },
  ),
);

/*
 * STEP 2:
 * Create and start a scheduled discovery job.
 */
schedulerQueue.enqueue({
  id:
    "discovery-job-001",

  provider:
    "amazon",

  scheduledAt:
    initialTime,

  status:
    SchedulerJobStatus.PENDING,

  attempts:
    0,
});

const schedulerJob =
  schedulerQueue.dequeue();

assert.ok(
  schedulerJob,
);

assert.equal(
  schedulerJob.id,
  "discovery-job-001",
);

assert.equal(
  schedulerJob.status,
  SchedulerJobStatus.RUNNING,
);

assert.equal(
  schedulerJob.attempts,
  1,
);

/*
 * STEP 3:
 * Simulate a provider discovery batch containing:
 *
 * - Three new unique deals.
 * - One duplicate within the current batch.
 * - One duplicate already persisted.
 */
const discoveredBatch: DealRecord[] = [
  createDeal(
    "deal-001",
    {
      externalId:
        "amazon-001",

      title:
        "Premium Smartphone",

      score:
        96,

      discountPercentage:
        30,

      expiresAt:
        new Date(
          "2026-12-31T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-002",
    {
      externalId:
        "amazon-002",

      title:
        "Gaming Laptop",

      score:
        91,

      discountPercentage:
        25,

      expiresAt:
        new Date(
          "2026-12-31T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-003",
    {
      externalId:
        "amazon-003",

      title:
        "Wireless Headphones",

      score:
        84,

      discountPercentage:
        35,

      expiresAt:
        new Date(
          "2026-07-24T00:00:00.000Z",
        ),
    },
  ),

  createDeal(
    "deal-duplicate-batch",
    {
      externalId:
        "amazon-002",

      title:
        "Duplicate Gaming Laptop",

      score:
        80,
    },
  ),

  createDeal(
    "deal-duplicate-database",
    {
      externalId:
        "amazon-existing",

      title:
        "Previously Stored Deal",

      score:
        88,
    },
  ),
];

const duplicateResult =
  await duplicateDetection.filter(
    discoveredBatch,
  );

assert.equal(
  duplicateResult.accepted.length,
  3,
);

assert.equal(
  duplicateResult.duplicates.length,
  2,
);

assert.deepEqual(
  duplicateResult.accepted.map(
    deal =>
      deal.id,
  ),
  [
    "deal-001",
    "deal-002",
    "deal-003",
  ],
);

/*
 * STEP 4:
 * Persist accepted discoveries.
 */
const persistenceResult =
  await discoveryPersistence.persist(
    duplicateResult.accepted,
  );

assert.deepEqual(
  persistenceResult,
  {
    inserted:
      3,

    updated:
      0,

    skipped:
      0,
  },
);

assert.equal(
  await repository.count(),
  4,
);

/*
 * STEP 5:
 * Run a second incremental discovery cycle.
 *
 * deal-001 is unchanged.
 * deal-002 receives a price and score update.
 */
const secondDiscoveryResult =
  await discoveryPersistence.persist([
    createDeal(
      "deal-001",
      {
        externalId:
          "amazon-001",

        title:
          "Premium Smartphone",

        score:
          96,

        discountPercentage:
          30,

        expiresAt:
          new Date(
            "2026-12-31T00:00:00.000Z",
          ),
      },
    ),

    createDeal(
      "deal-002",
      {
        externalId:
          "amazon-002",

        title:
          "Gaming Laptop",

        currentPrice:
          700,

        score:
          94,

        discountPercentage:
          30,

        expiresAt:
          new Date(
            "2026-12-31T00:00:00.000Z",
          ),
      },
    ),
  ]);

assert.deepEqual(
  secondDiscoveryResult,
  {
    inserted:
      0,

    updated:
      1,

    skipped:
      1,
  },
);

const updatedDeal =
  await repository.findByExternalId(
    DealSource.AMAZON,
    "amazon-002",
  );

assert.equal(
  updatedDeal?.id,
  "deal-002",
);

assert.equal(
  updatedDeal?.currentPrice,
  700,
);

assert.equal(
  updatedDeal?.score,
  94,
);

/*
 * STEP 6:
 * Apply publishing lifecycle transitions.
 *
 * deal-001 and deal-002 become published.
 * deal-003 becomes expired.
 */
const transitionResult =
  await publishedDealService.applyTransitions({
    published: [
      {
        id:
          "deal-001",
      },

      {
        id:
          "deal-002",
      },
    ],

    archived:
      [],

    expired: [
      {
        id:
          "deal-003",
      },
    ],
  });

assert.deepEqual(
  transitionResult,
  {
    published:
      2,

    archived:
      0,

    expired:
      1,

    unchanged:
      0,

    missing:
      0,
  },
);

const publishedDeal =
  await repository.findById(
    "deal-001",
  );

assert.equal(
  publishedDeal?.status,
  DealStatus.PUBLISHED,
);

assert.equal(
  publishedDeal?.publishedAt?.toISOString(),
  publishTime.toISOString(),
);

const expiredDeal =
  await repository.findById(
    "deal-003",
  );

assert.equal(
  expiredDeal?.status,
  DealStatus.EXPIRED,
);

/*
 * STEP 7:
 * Complete the scheduler job.
 */
schedulerQueue.complete(
  "discovery-job-001",
);

assert.deepEqual(
  schedulerQueue.statistics(),
  {
    pending:
      0,

    running:
      0,

    completed:
      1,

    failed:
      0,
  },
);

/*
 * STEP 8:
 * Verify the public API only returns published deals
 * by default.
 */
const publishedResponse =
  await dealsApi.listDeals({
    minimumScore:
      80,

    sortBy:
      "score",

    sortDirection:
      "desc",
  });

assert.equal(
  publishedResponse.total,
  2,
);

assert.deepEqual(
  publishedResponse.items.map(
    deal =>
      deal.id,
  ),
  [
    "deal-001",
    "deal-002",
  ],
);

assert.equal(
  publishedResponse.items[0].score,
  96,
);

assert.equal(
  publishedResponse.items[1].score,
  94,
);

/*
 * STEP 9:
 * Verify direct retrieval.
 */
const singleDeal =
  await dealsApi.getDeal(
    "deal-002",
  );

assert.equal(
  singleDeal?.title,
  "Gaming Laptop",
);

assert.equal(
  singleDeal?.status,
  DealStatus.PUBLISHED,
);

/*
 * STEP 10:
 * Verify expired deal filtering.
 */
const expiredResponse =
  await dealsApi.listDeals({
    status:
      DealStatus.EXPIRED,
  });

assert.equal(
  expiredResponse.total,
  1,
);

assert.equal(
  expiredResponse.items[0].id,
  "deal-003",
);

/*
 * STEP 11:
 * Run cleanup far enough in the future to archive
 * the published deals.
 */
const cleanupTime =
  new Date(
    "2026-09-01T00:00:00.000Z",
  );

const cleanupResult =
  await cleanupService.run({
    now:
      cleanupTime,

    archivePublishedAfterDays:
      30,

    deleteArchivedAfterDays:
      90,
  });

assert.deepEqual(
  cleanupResult,
  {
    expired:
      1,

    archived:
      2,

    deleted:
      0,
  },
);

/*
 * The previously seeded discovered deal also had an
 * expiry date before cleanupTime, so it becomes expired.
 */
assert.equal(
  await repository.count({
    status:
      DealStatus.ARCHIVED,
  }),
  2,
);

assert.equal(
  await repository.count({
    status:
      DealStatus.EXPIRED,
  }),
  2,
);

assert.equal(
  await repository.count({
    status:
      DealStatus.PUBLISHED,
  }),
  0,
);

/*
 * STEP 12:
 * Verify the public default published listing is empty
 * after archival.
 */
const emptyPublishedResponse =
  await dealsApi.listDeals();

assert.equal(
  emptyPublishedResponse.total,
  0,
);

assert.equal(
  emptyPublishedResponse.items.length,
  0,
);

/*
 * STEP 13:
 * Confirm lifecycle isolation and defensive cloning.
 */
const archivedDeal =
  await repository.findById(
    "deal-001",
  );

assert.ok(
  archivedDeal,
);

archivedDeal.title =
  "External mutation";

const persistedArchivedDeal =
  await repository.findById(
    "deal-001",
  );

assert.notEqual(
  persistedArchivedDeal?.title,
  "External mutation",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      discovery: {
        received:
          discoveredBatch.length,

        accepted:
          duplicateResult.accepted.length,

        duplicates:
          duplicateResult.duplicates.length,
      },

      persistence: {
        inserted:
          persistenceResult.inserted,

        updated:
          secondDiscoveryResult.updated,

        skipped:
          secondDiscoveryResult.skipped,
      },

      transitions:
        transitionResult,

      scheduler:
        schedulerQueue.statistics(),

      api: {
        publishedBeforeCleanup:
          publishedResponse.total,

        publishedAfterCleanup:
          emptyPublishedResponse.total,
      },

      cleanup:
        cleanupResult,

      finalRepositoryCount:
        await repository.count(),

      defensiveCloning:
        true,
    },
    null,
    2,
  ),
);
