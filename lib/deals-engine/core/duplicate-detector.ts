import type { RawDeal } from "../contracts";

export interface DuplicateDetectionResult {
  uniqueDeals: RawDeal[];
  duplicateDeals: RawDeal[];
}

export class DuplicateDetector {

  removeDuplicates(
    deals: RawDeal[],
  ): DuplicateDetectionResult {

    const uniqueDeals: RawDeal[] = [];
    const duplicateDeals: RawDeal[] = [];

    const seen = new Set<string>();

    for (const deal of deals) {

      const key = this.createKey(deal);

      if (seen.has(key)) {
        duplicateDeals.push(deal);
        continue;
      }

      seen.add(key);
      uniqueDeals.push(deal);
    }

    return {
      uniqueDeals,
      duplicateDeals,
    };
  }

  private createKey(
    deal: RawDeal,
  ): string {

    return [
      (deal.title ?? "")
        .trim()
        .toLowerCase(),

      (deal.retailer ?? "")
        .trim()
        .toLowerCase(),

      Number(deal.currentPrice ?? 0).toFixed(2),

      (deal.dealUrl ?? "")
        .trim()
        .toLowerCase(),
    ].join("|");
  }
}
