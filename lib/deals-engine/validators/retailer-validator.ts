import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class RetailerValidator implements DealValidator {
  readonly name = "RetailerValidator";

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    const retailer =
      typeof deal.retailer === "string"
        ? deal.retailer.trim()
        : "";

    if (!retailer) {
      errors.push({
        code: "RETAILER_REQUIRED",
        message: "Retailer is required",
      });
    }

    if (retailer.length > 100) {
      errors.push({
        code: "RETAILER_TOO_LONG",
        message: "Retailer name is too long",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
