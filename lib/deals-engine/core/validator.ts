import type { Deal } from "../models/deal";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDeal(deal: Deal): ValidationResult {
  const errors: string[] = [];

  if (!deal.title?.trim()) errors.push("Missing title");
  if (!deal.dealUrl?.trim()) errors.push("Missing deal URL");
  if (!deal.imageUrl?.trim()) errors.push("Missing image");
  if (!deal.platform?.trim()) errors.push("Missing platform");
  if (!deal.category?.trim()) errors.push("Missing category");

  if (deal.currentPrice <= 0)
    errors.push("Invalid current price");

  if (
    deal.originalPrice &&
    deal.originalPrice < deal.currentPrice
  ) {
    errors.push("Original price smaller than current price");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
