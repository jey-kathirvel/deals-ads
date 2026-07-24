import {
  and,
  eq,
  isNull,
  lt,
  lte,
  notExists,
  or,
} from "drizzle-orm";

import { getDb } from "../../../db";
import {
  deals,
  notifications,
  savedDeals,
} from "../../../db/schema";

export interface LifecycleRunResult {
  discoveryDate: string;
  expiredDeals: number;
  expiryNotificationsCreated: number;
  deletedUnsavedDeals: number;
  completedAt: string;
}

function indiaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfPreviousIndiaDate(now = new Date()): Date {
  const today = indiaDateString(now);

  return new Date(`${today}T00:00:00+05:30`);
}

/**
 * Marks deals as expired when:
 *
 * 1. Their explicit expiry time has passed, or
 * 2. They belong to a previous discovery date.
 *
 * Saved deals are retained as EXPIRED.
 */
async function expireStaleDeals(now: Date): Promise<number> {
  const db = getDb();
  const today = indiaDateString(now);

  const staleDeals = await db
    .select({
      id: deals.id,
    })
    .from(deals)
    .where(
      and(
        or(
          eq(deals.status, "ACTIVE"),
          eq(deals.status, "EXPIRING"),
        ),
        or(
          lt(deals.discoveryDate, today),
          and(
            lte(deals.expiresAt, now),
          ),
        ),
      ),
    );

  if (staleDeals.length === 0) {
    return 0;
  }

  await db
    .update(deals)
    .set({
      status: "EXPIRED",
      expiredAt: now,
      updatedAt: now,
    })
    .where(
      and(
        or(
          eq(deals.status, "ACTIVE"),
          eq(deals.status, "EXPIRING"),
        ),
        or(
          lt(deals.discoveryDate, today),
          lte(deals.expiresAt, now),
        ),
      ),
    );

  return staleDeals.length;
}

/**
 * Creates one in-app notification for each newly expired saved deal.
 *
 * The saved_deals.expired_notified_at field prevents duplicate alerts.
 */
async function createExpiredSavedDealNotifications(
  now: Date,
): Promise<number> {
  const db = getDb();

  const pending = await db
    .select({
      savedDealId: savedDeals.id,
      userId: savedDeals.userId,
      dealId: deals.id,
      dealTitle: deals.title,
    })
    .from(savedDeals)
    .innerJoin(
      deals,
      eq(savedDeals.dealId, deals.id),
    )
    .where(
      and(
        eq(deals.status, "EXPIRED"),
        isNull(savedDeals.expiredNotifiedAt),
      ),
    );

  let created = 0;

  for (const item of pending) {
    await db.insert(notifications).values({
      userId: item.userId,
      dealId: item.dealId,
      type: "DEAL_EXPIRED",
      title: "Saved deal expired",
      message: `${item.dealTitle} is no longer active.`,
      channel: "IN_APP",
      status: "PENDING",
      createdAt: now,
    });

    await db
      .update(savedDeals)
      .set({
        expiredNotifiedAt: now,
      })
      .where(eq(savedDeals.id, item.savedDealId));

    created += 1;
  }

  return created;
}

/**
 * Removes expired deals from previous discovery days only when no user has
 * saved them. Saved deals remain available in the user's Save List with an
 * EXPIRED state.
 */
async function deleteExpiredUnsavedDeals(
  now: Date,
): Promise<number> {
  const db = getDb();
  const today = indiaDateString(now);
  const previousIndiaDayStartedAt =
    startOfPreviousIndiaDate(now);

  const deletable = await db
    .select({
      id: deals.id,
    })
    .from(deals)
    .where(
      and(
        eq(deals.status, "EXPIRED"),
        lt(deals.discoveryDate, today),
        or(
          isNull(deals.expiredAt),
          lte(deals.expiredAt, previousIndiaDayStartedAt),
        ),
        notExists(
          db
            .select({
              id: savedDeals.id,
            })
            .from(savedDeals)
            .where(eq(savedDeals.dealId, deals.id)),
        ),
      ),
    );

  if (deletable.length === 0) {
    return 0;
  }

  await db
    .delete(deals)
    .where(
      and(
        eq(deals.status, "EXPIRED"),
        lt(deals.discoveryDate, today),
        or(
          isNull(deals.expiredAt),
          lte(deals.expiredAt, previousIndiaDayStartedAt),
        ),
        notExists(
          db
            .select({
              id: savedDeals.id,
            })
            .from(savedDeals)
            .where(eq(savedDeals.dealId, deals.id)),
        ),
      ),
    );

  return deletable.length;
}

export async function runDailyDealLifecycle(
  now = new Date(),
): Promise<LifecycleRunResult> {
  const expiredDeals = await expireStaleDeals(now);

  const expiryNotificationsCreated =
    await createExpiredSavedDealNotifications(now);

  const deletedUnsavedDeals =
    await deleteExpiredUnsavedDeals(now);

  return {
    discoveryDate: indiaDateString(now),
    expiredDeals,
    expiryNotificationsCreated,
    deletedUnsavedDeals,
    completedAt: new Date().toISOString(),
  };
}
