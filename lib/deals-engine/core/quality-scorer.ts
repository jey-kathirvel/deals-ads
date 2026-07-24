import type { RawDeal } from "../contracts";

export interface QualityScoreResult {
  score: number;
  reasons: string[];
}

export class QualityScorer {

  score(
    deal: RawDeal,
  ): QualityScoreResult {

    let score = 0;

    const reasons: string[] = [];

    if (deal.title?.trim()) {
      score += 15;
      reasons.push("title");
    }

    if (deal.imageUrl?.trim()) {
      score += 15;
      reasons.push("image");
    }

    if (deal.dealUrl?.trim()) {
      score += 15;
      reasons.push("url");
    }

    if (
      Number.isFinite(deal.currentPrice) &&
      deal.currentPrice > 0
    ) {
      score += 15;
      reasons.push("price");
    }

    if (
      Number.isFinite(deal.originalPrice) &&
      deal.originalPrice > deal.currentPrice
    ) {
      score += 15;
      reasons.push("original-price");
    }

    if (
      Number.isFinite(deal.discountPercent) &&
      deal.discountPercent > 0
    ) {
      score += 10;
      reasons.push("discount");
    }

    if (deal.expiresAt instanceof Date) {
      score += 10;
      reasons.push("expiry");
    }

    if (deal.retailer?.trim()) {
      score += 5;
      reasons.push("retailer");
    }

    return {
      score: Math.min(score, 100),
      reasons,
    };
  }
}
