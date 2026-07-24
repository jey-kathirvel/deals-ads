import type { Deal } from "../models/deal";

export function deduplicateDeals(
  deals: Deal[]
): Deal[] {

  const map = new Map<string, Deal>();

  for (const deal of deals) {
    const key = (
      deal.platform +
      "|" +
      deal.title.trim().toLowerCase() +
      "|" +
      deal.currentPrice
    );

    if (!map.has(key)) {
      map.set(key, deal);
    }
  }

  return [...map.values()];
}
