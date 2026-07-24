import type { Deal } from "../models/deal";
import type { Coupon } from "../models/coupon";
import type { DiscoveryProvider } from "../providers/provider";

import { validateDeal } from "./validator";
import { deduplicateDeals } from "./deduplicator";
import { calculateDealScore } from "../utils/score";
import { normalizeUrl } from "../utils/url";

export interface DiscoverySummary {
  providers: number;
  discoveredDeals: number;
  discoveredCoupons: number;
  validDeals: number;
  publishedDeals: number;
  rejectedDeals: number;
}

export interface DiscoveryOutput {
  deals: Deal[];
  coupons: Coupon[];
  summary: DiscoverySummary;
}

export class DiscoveryEngine {
  private readonly providers: DiscoveryProvider[] = [];

  register(provider: DiscoveryProvider): void {
    if (provider.enabled) {
      this.providers.push(provider);
    }
  }

  async run(maxDeals = 100): Promise<DiscoveryOutput> {
    const discoveredDeals: Deal[] = [];
    const discoveredCoupons: Coupon[] = [];

    for (const provider of this.providers) {
      const result = await provider.discover();

      discoveredDeals.push(...result.deals);
      discoveredCoupons.push(...result.coupons);
    }

    const validDeals: Deal[] = [];

    for (const deal of discoveredDeals) {
      const validation = validateDeal(deal);

      if (!validation.valid) {
        continue;
      }

      deal.score = calculateDealScore(deal);

      validDeals.push(deal);
    }

    const rankedDeals = deduplicateDeals(validDeals)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, maxDeals);

    return {
      deals: rankedDeals,
      coupons: discoveredCoupons,
      summary: {
        providers: this.providers.length,
        discoveredDeals: discoveredDeals.length,
        discoveredCoupons: discoveredCoupons.length,
        validDeals: validDeals.length,
        publishedDeals: rankedDeals.length,
        rejectedDeals:
          discoveredDeals.length - validDeals.length,
      },
    };
  }
}
