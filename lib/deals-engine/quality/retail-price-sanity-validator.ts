export type RetailPriceIssueSeverity =
  | "warning"
  | "error";

export interface RetailPriceSanityInput {
  currentPrice?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  currency?: string | null;
}

export interface RetailPriceSanityIssue {
  code: string;
  severity: RetailPriceIssueSeverity;
  field:
    | "currentPrice"
    | "originalPrice"
    | "discountPercentage"
    | "currency";
  message: string;
}

export interface RetailPriceSanityResult {
  valid: boolean;
  score: number;
  calculatedDiscountPercentage: number | null;
  effectiveDiscountPercentage: number | null;
  issues: RetailPriceSanityIssue[];
}

export interface RetailPriceSanityValidatorOptions {
  maximumAllowedDiscountPercentage?: number;
  suspiciousDiscountPercentage?: number;
  discountTolerancePercentagePoints?: number;
  maximumPrice?: number;
  minimumPrice?: number;
  supportedCurrencies?: readonly string[];
}

const DEFAULT_SUPPORTED_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
] as const;

export class RetailPriceSanityValidator {
  private readonly maximumAllowedDiscountPercentage: number;
  private readonly suspiciousDiscountPercentage: number;
  private readonly discountTolerancePercentagePoints: number;
  private readonly maximumPrice: number;
  private readonly minimumPrice: number;
  private readonly supportedCurrencies: ReadonlySet<string>;

  constructor(
    options: RetailPriceSanityValidatorOptions = {},
  ) {
    this.maximumAllowedDiscountPercentage =
      this.validatePercentageOption(
        options.maximumAllowedDiscountPercentage ?? 95,
        "maximumAllowedDiscountPercentage",
      );

    this.suspiciousDiscountPercentage =
      this.validatePercentageOption(
        options.suspiciousDiscountPercentage ?? 80,
        "suspiciousDiscountPercentage",
      );

    this.discountTolerancePercentagePoints =
      this.validateNonNegativeFiniteOption(
        options.discountTolerancePercentagePoints ?? 2,
        "discountTolerancePercentagePoints",
      );

    this.maximumPrice =
      this.validatePositiveFiniteOption(
        options.maximumPrice ?? 100_000_000,
        "maximumPrice",
      );

    this.minimumPrice =
      this.validatePositiveFiniteOption(
        options.minimumPrice ?? 0.01,
        "minimumPrice",
      );

    if (this.minimumPrice > this.maximumPrice) {
      throw new RangeError(
        "minimumPrice cannot exceed maximumPrice",
      );
    }

    if (
      this.suspiciousDiscountPercentage >
      this.maximumAllowedDiscountPercentage
    ) {
      throw new RangeError(
        "suspiciousDiscountPercentage cannot exceed maximumAllowedDiscountPercentage",
      );
    }

    const currencies =
      options.supportedCurrencies ??
      DEFAULT_SUPPORTED_CURRENCIES;

    this.supportedCurrencies =
      new Set(
        currencies
          .map(
            currency =>
              currency.trim().toUpperCase(),
          )
          .filter(Boolean),
      );
  }

  validate(
    input: RetailPriceSanityInput,
  ): RetailPriceSanityResult {
    const issues: RetailPriceSanityIssue[] = [];

    let score = 100;

    const currentPrice =
      input.currentPrice;

    const originalPrice =
      input.originalPrice;

    const suppliedDiscount =
      input.discountPercentage;

    const currency =
      input.currency
        ?.trim()
        .toUpperCase() ??
      null;

    const currentPriceValid =
      this.isPositiveFiniteNumber(
        currentPrice,
      );

    const originalPricePresent =
      originalPrice !== null &&
      originalPrice !== undefined;

    const originalPriceValid =
      this.isPositiveFiniteNumber(
        originalPrice,
      );

    if (!currentPriceValid) {
      this.addIssue(
        issues,
        "invalid_current_price",
        "error",
        "currentPrice",
        "Current price must be a finite number greater than zero",
      );

      score -= 100;
    } else {
      if (
        currentPrice <
        this.minimumPrice
      ) {
        this.addIssue(
          issues,
          "current_price_below_minimum",
          "error",
          "currentPrice",
          "Current price is below the configured minimum price",
        );

        score -= 60;
      }

      if (
        currentPrice >
        this.maximumPrice
      ) {
        this.addIssue(
          issues,
          "current_price_above_maximum",
          "error",
          "currentPrice",
          "Current price exceeds the configured maximum price",
        );

        score -= 60;
      }
    }

    if (!originalPricePresent) {
      this.addIssue(
        issues,
        "missing_original_price",
        "warning",
        "originalPrice",
        "Original retail price is missing",
      );

      score -= 10;
    } else if (!originalPriceValid) {
      this.addIssue(
        issues,
        "invalid_original_price",
        "error",
        "originalPrice",
        "Original price must be a finite number greater than zero",
      );

      score -= 50;
    } else {
      if (
        originalPrice <
        this.minimumPrice
      ) {
        this.addIssue(
          issues,
          "original_price_below_minimum",
          "error",
          "originalPrice",
          "Original price is below the configured minimum price",
        );

        score -= 40;
      }

      if (
        originalPrice >
        this.maximumPrice
      ) {
        this.addIssue(
          issues,
          "original_price_above_maximum",
          "error",
          "originalPrice",
          "Original price exceeds the configured maximum price",
        );

        score -= 40;
      }
    }

    if (
      currentPriceValid &&
      originalPriceValid
    ) {
      if (
        currentPrice >
        originalPrice
      ) {
        this.addIssue(
          issues,
          "price_inversion",
          "error",
          "originalPrice",
          "Original price is lower than the current price",
        );

        score -= 70;
      } else if (
        currentPrice ===
        originalPrice
      ) {
        this.addIssue(
          issues,
          "no_price_reduction",
          "warning",
          "currentPrice",
          "Current price equals the original price",
        );

        score -= 20;
      }
    }

    const calculatedDiscountPercentage =
      this.calculateDiscountPercentage(
        currentPrice,
        originalPrice,
      );

    const suppliedDiscountValid =
      suppliedDiscount === null ||
      suppliedDiscount === undefined ||
      (
        typeof suppliedDiscount === "number" &&
        Number.isFinite(
          suppliedDiscount,
        )
      );

    if (!suppliedDiscountValid) {
      this.addIssue(
        issues,
        "invalid_discount_value",
        "error",
        "discountPercentage",
        "Discount percentage must be a finite number",
      );

      score -= 40;
    } else if (
      suppliedDiscount !== null &&
      suppliedDiscount !== undefined
    ) {
      if (
        suppliedDiscount < 0 ||
        suppliedDiscount >= 100
      ) {
        this.addIssue(
          issues,
          "discount_out_of_range",
          "error",
          "discountPercentage",
          "Discount percentage must be at least zero and below 100",
        );

        score -= 60;
      }

      if (
        suppliedDiscount >
        this.maximumAllowedDiscountPercentage
      ) {
        this.addIssue(
          issues,
          "discount_above_allowed_maximum",
          "error",
          "discountPercentage",
          "Discount exceeds the configured maximum allowed percentage",
        );

        score -= 50;
      } else if (
        suppliedDiscount >=
        this.suspiciousDiscountPercentage
      ) {
        this.addIssue(
          issues,
          "suspicious_discount",
          "warning",
          "discountPercentage",
          "Discount is unusually high and should be verified",
        );

        score -= 20;
      }
    }

    if (
      calculatedDiscountPercentage !== null
    ) {
      if (
        calculatedDiscountPercentage >
        this.maximumAllowedDiscountPercentage
      ) {
        this.addIssue(
          issues,
          "calculated_discount_above_allowed_maximum",
          "error",
          "currentPrice",
          "Prices imply a discount above the configured maximum",
        );

        score -= 50;
      } else if (
        calculatedDiscountPercentage >=
        this.suspiciousDiscountPercentage
      ) {
        this.addIssue(
          issues,
          "calculated_discount_suspicious",
          "warning",
          "currentPrice",
          "Prices imply an unusually high discount",
        );

        score -= 20;
      }

      if (
        typeof suppliedDiscount === "number" &&
        Number.isFinite(
          suppliedDiscount,
        ) &&
        suppliedDiscount >= 0 &&
        suppliedDiscount < 100
      ) {
        const difference =
          Math.abs(
            suppliedDiscount -
            calculatedDiscountPercentage,
          );

        if (
          difference >
          this.discountTolerancePercentagePoints
        ) {
          this.addIssue(
            issues,
            "discount_mismatch",
            "error",
            "discountPercentage",
            "Supplied discount does not match the prices",
          );

          score -= 35;
        }
      }
    }

    if (!currency) {
      this.addIssue(
        issues,
        "missing_currency",
        "warning",
        "currency",
        "Currency is missing",
      );

      score -= 5;
    } else if (
      !/^[A-Z]{3}$/.test(currency)
    ) {
      this.addIssue(
        issues,
        "invalid_currency_code",
        "error",
        "currency",
        "Currency must be a three-letter ISO-style code",
      );

      score -= 20;
    } else if (
      this.supportedCurrencies.size > 0 &&
      !this.supportedCurrencies.has(
        currency,
      )
    ) {
      this.addIssue(
        issues,
        "unsupported_currency",
        "warning",
        "currency",
        "Currency is not in the configured supported currency list",
      );

      score -= 10;
    }

    score =
      this.clamp(
        Math.round(score),
        0,
        100,
      );

    const hasError =
      issues.some(
        issue =>
          issue.severity === "error",
      );

    const effectiveDiscountPercentage =
      calculatedDiscountPercentage ??
      (
        typeof suppliedDiscount === "number" &&
        Number.isFinite(
          suppliedDiscount,
        )
          ? suppliedDiscount
          : null
      );

    return {
      valid:
        !hasError &&
        score >= 70,

      score,

      calculatedDiscountPercentage,

      effectiveDiscountPercentage,

      issues,
    };
  }

  private calculateDiscountPercentage(
    currentPrice: number | null | undefined,
    originalPrice: number | null | undefined,
  ): number | null {
    if (
      !this.isPositiveFiniteNumber(
        currentPrice,
      ) ||
      !this.isPositiveFiniteNumber(
        originalPrice,
      ) ||
      currentPrice >
        originalPrice
    ) {
      return null;
    }

    return this.round(
      (
        (
          originalPrice -
          currentPrice
        ) /
        originalPrice
      ) * 100,
      2,
    );
  }

  private isPositiveFiniteNumber(
    value: number | null | undefined,
  ): value is number {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0
    );
  }

  private addIssue(
    issues: RetailPriceSanityIssue[],
    code: string,
    severity: RetailPriceIssueSeverity,
    field: RetailPriceSanityIssue["field"],
    message: string,
  ): void {
    issues.push({
      code,
      severity,
      field,
      message,
    });
  }

  private validatePercentageOption(
    value: number,
    name: string,
  ): number {
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value >= 100
    ) {
      throw new RangeError(
        `${name} must be at least zero and below 100`,
      );
    }

    return value;
  }

  private validatePositiveFiniteOption(
    value: number,
    name: string,
  ): number {
    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new RangeError(
        `${name} must be a finite number greater than zero`,
      );
    }

    return value;
  }

  private validateNonNegativeFiniteOption(
    value: number,
    name: string,
  ): number {
    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new RangeError(
        `${name} must be a finite non-negative number`,
      );
    }

    return value;
  }

  private round(
    value: number,
    decimalPlaces: number,
  ): number {
    const factor =
      10 ** decimalPlaces;

    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
        factor,
      ) /
      factor
    );
  }

  private clamp(
    value: number,
    minimum: number,
    maximum: number,
  ): number {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value,
      ),
    );
  }
}
