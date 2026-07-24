import type { RawDeal } from "../contracts";
import { QualityScorer } from "./quality-scorer";

export interface PublishFilterResult {
  publishableDeals: RawDeal[];
  rejectedDeals: RawDeal[];
}

export class PublishFilter {

  constructor(
    private readonly scorer = new QualityScorer(),
    private readonly minimumScore = 70,
  ) {}

  filter(
    deals: RawDeal[],
  ): PublishFilterResult {

    const publishableDeals: RawDeal[] = [];
    const rejectedDeals: RawDeal[] = [];

    for (const deal of deals) {

      const result = this.scorer.score(deal);

      if (result.score >= this.minimumScore) {
        publishableDeals.push(deal);
      } else {
        rejectedDeals.push(deal);
      }
    }

    return {
      publishableDeals,
      rejectedDeals,
    };
  }
}
