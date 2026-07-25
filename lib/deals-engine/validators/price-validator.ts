import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class PriceValidator implements DealValidator {
  readonly name = "PriceValidator";

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    if (!Number.isFinite(deal.currentPrice) || deal.currentPrice <= 0) {
      errors.push({
        code: "CURRENT_PRICE_INVALID",
        message: "Current price must be greater than zero",
      });
    }

    if (!Number.isFinite(deal.originalPrice) || deal.originalPrice <= 0) {
      errors.push({
        code: "ORIGINAL_PRICE_INVALID",
        message: "Original price must be greater than zero",
      });
    }

    if (
      Number.isFinite(deal.currentPrice) &&
      Number.isFinite(deal.originalPrice) &&
      deal.currentPrice > deal.originalPrice
    ) {
      errors.push({
        code: "PRICE_INCONSISTENT",
        message: "Current price cannot exceed original price",
      });
    }

    if (
      Number.isFinite(deal.discountPercent) &&
      (deal.discountPercent < 0 || deal.discountPercent > 100)
    ) {
      errors.push({
        code: "DISCOUNT_INVALID",
        message: "Discount must be between 0 and 100",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
