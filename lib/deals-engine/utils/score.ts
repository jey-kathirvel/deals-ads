import type { Deal } from "../models/deal";

export function calculateDealScore(deal: Deal): number {
  let score = 0;

  if (deal.imageUrl) score += 15;
  if (deal.title) score += 10;
  if (deal.currentPrice > 0) score += 15;

  if (
    deal.originalPrice &&
    deal.discountPercent
  ) {
    score += 20;
  }

  if (deal.rating && deal.rating >= 4)
    score += 10;

  if (deal.reviewCount && deal.reviewCount > 100)
    score += 10;

  if (deal.expiresAt)
    score += 10;

  if (deal.category)
    score += 5;

  if (deal.platform)
    score += 5;

  return Math.min(score, 100);
}
