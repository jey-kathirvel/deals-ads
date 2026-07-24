import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class ExpiryValidator implements DealValidator {
  readonly name = "ExpiryValidator";

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    if (!deal.expiresAt) {
      errors.push({
        code: "EXPIRY_REQUIRED",
        message: "Expiry date is required",
      });

      return {
        valid: false,
        errors,
      };
    }

    if (!(deal.expiresAt instanceof Date)) {
      errors.push({
        code: "EXPIRY_INVALID",
        message: "Expiry must be a valid Date",
      });

      return {
        valid: false,
        errors,
      };
    }

    if (Number.isNaN(deal.expiresAt.getTime())) {
      errors.push({
        code: "EXPIRY_INVALID",
        message: "Expiry date is invalid",
      });

      return {
        valid: false,
        errors,
      };
    }

    if (deal.expiresAt.getTime() <= Date.now()) {
      errors.push({
        code: "EXPIRED_DEAL",
        message: "Deal already expired",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
