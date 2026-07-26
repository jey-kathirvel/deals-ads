import { deleteLegacyDeal, getLegacyDeals } from "./deals-compat";

export interface LifecycleRunResult {
  discoveryDate: string;
  expiredDeals: number;
  inactiveDeals: number;
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

function expiredAt(
  deal: {
    expiryDate: string;
  },
  now: Date,
): boolean {
  if (!deal.expiryDate.trim()) {
    return false;
  }

  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(deal.expiryDate)
    ? new Date(`${deal.expiryDate}T23:59:59.999+05:30`).getTime()
    : new Date(deal.expiryDate).getTime();

  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

export async function runDailyDealLifecycle(
  now = new Date(),
): Promise<LifecycleRunResult> {
  const deals = await getLegacyDeals();

  const expiredDeals = deals.filter(
    (deal) => deal.status === "expired" || expiredAt(deal, now),
  );

  /*
   * Inactive published deals are invalid public records and are removed.
   * Draft and review records may intentionally be inactive, so they remain.
   */
  const inactiveDeals = deals.filter(
    (deal) =>
      deal.status === "published" &&
      !deal.active &&
      !expiredDeals.some((expiredDeal) => expiredDeal.id === deal.id),
  );

  const confirmedInvalidDeals = [...expiredDeals, ...inactiveDeals];

  for (const deal of confirmedInvalidDeals) {
    await deleteLegacyDeal(deal.id);
  }

  return {
    discoveryDate: indiaDateString(now),
    expiredDeals: expiredDeals.length,
    inactiveDeals: inactiveDeals.length,
    expiryNotificationsCreated: 0,
    deletedUnsavedDeals: confirmedInvalidDeals.length,
    completedAt: new Date().toISOString(),
  };
}
