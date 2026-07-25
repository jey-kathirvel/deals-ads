import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class ImageValidator implements DealValidator {
  readonly name = "ImageValidator";

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    const image = deal.imageUrl.trim();

    if (!image) {
      errors.push({
        code: "IMAGE_REQUIRED",
        message: "Image URL is required",
      });
    }

    else if (!/^https?:\/\//i.test(image)) {
      errors.push({
        code: "IMAGE_INVALID",
        message: "Image URL must be absolute",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
