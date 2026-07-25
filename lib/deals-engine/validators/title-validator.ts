import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export class TitleValidator implements DealValidator {
  readonly name = "TitleValidator";

  constructor(
    private readonly minimumLength = 5,
    private readonly maximumLength = 200,
  ) {}

  async validate(
    deal: RawDeal,
  ): Promise<DealValidationResult> {

    const errors = [];

    const title =
      typeof deal.title === "string"
        ? deal.title.trim()
        : "";

    if (!title) {
      errors.push({
        code: "TITLE_REQUIRED",
        message: "Deal title is required",
      });
    } else {
      if (title.length < this.minimumLength) {
        errors.push({
          code: "TITLE_TOO_SHORT",
          message: `Deal title must contain at least ${this.minimumLength} characters`,
        });
      }

      if (title.length > this.maximumLength) {
        errors.push({
          code: "TITLE_TOO_LONG",
          message: `Deal title cannot exceed ${this.maximumLength} characters`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
