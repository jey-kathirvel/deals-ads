import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class UrlValidator implements DealValidator {
  readonly name = "UrlValidator";

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    const url = deal.dealUrl.trim();

    if (!url) {
      errors.push({
        code: "URL_REQUIRED",
        message: "Deal URL is required",
      });
    } else {
      try {
        const parsed = new URL(url);

        if (
          parsed.protocol !== "https:" &&
          parsed.protocol !== "http:"
        ) {
          errors.push({
            code: "URL_PROTOCOL_INVALID",
            message: "Only HTTP/HTTPS URLs are supported",
          });
        }
      } catch {
        errors.push({
          code: "URL_INVALID",
          message: "Invalid URL",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
