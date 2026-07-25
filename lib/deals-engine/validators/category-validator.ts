import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class CategoryValidator implements DealValidator {
  readonly name = "CategoryValidator";

  constructor(
    private readonly allowedCategories: readonly string[] = [],
  ) {}

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    const category =
      typeof deal.category === "string"
        ? deal.category.trim()
        : String(deal.category ?? "").trim();

    if (!category) {
      errors.push({
        code: "CATEGORY_REQUIRED",
        message: "Category is required",
      });

      return {
        valid: false,
        errors,
      };
    }

    if (
      this.allowedCategories.length > 0 &&
      !this.allowedCategories.includes(category)
    ) {
      errors.push({
        code: "CATEGORY_NOT_ALLOWED",
        message: "Category is not supported",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
