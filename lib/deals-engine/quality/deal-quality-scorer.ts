export type DealQualityGrade =
  | "excellent"
  | "good"
  | "fair"
  | "poor";

export interface DealQualityInput {
  title?: string | null;
  retailer?: string | null;
  category?: string | null;

  currentPrice?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;

  imageUrl?: string | null;
  url?: string | null;

  expiresAt?: Date | string | null;
}

export interface DealQualityBreakdown {
  title: number;
  retailer: number;
  category: number;
  pricing: number;
  discount: number;
  image: number;
  url: number;
  expiry: number;
}

export interface DealQualityIssue {
  code: string;
  field: keyof DealQualityInput;
  message: string;
  penalty: number;
}

export interface DealQualityResult {
  score: number;
  grade: DealQualityGrade;
  publishable: boolean;
  breakdown: DealQualityBreakdown;
  issues: DealQualityIssue[];
}

export interface DealQualityScorerOptions {
  minimumPublishableScore?: number;
  now?: Date;
}

const MAXIMUM_BREAKDOWN: DealQualityBreakdown = {
  title: 15,
  retailer: 10,
  category: 5,
  pricing: 20,
  discount: 15,
  image: 15,
  url: 10,
  expiry: 10,
};

export class DealQualityScorer {
  private readonly minimumPublishableScore: number;
  private readonly now: Date;

  constructor(
    options: DealQualityScorerOptions = {},
  ) {
    this.minimumPublishableScore =
      this.clamp(
        options.minimumPublishableScore ?? 70,
        0,
        100,
      );

    this.now =
      options.now
        ? new Date(options.now)
        : new Date();

    if (
      Number.isNaN(
        this.now.getTime(),
      )
    ) {
      throw new TypeError(
        "DealQualityScorer now value must be a valid date",
      );
    }
  }

  score(
    deal: DealQualityInput,
  ): DealQualityResult {
    const issues: DealQualityIssue[] = [];

    const breakdown: DealQualityBreakdown = {
      title:
        this.scoreTitle(
          deal.title,
          issues,
        ),

      retailer:
        this.scoreRetailer(
          deal.retailer,
          issues,
        ),

      category:
        this.scoreCategory(
          deal.category,
          issues,
        ),

      pricing:
        this.scorePricing(
          deal.currentPrice,
          deal.originalPrice,
          issues,
        ),

      discount:
        this.scoreDiscount(
          deal.currentPrice,
          deal.originalPrice,
          deal.discountPercentage,
          issues,
        ),

      image:
        this.scoreImage(
          deal.imageUrl,
          issues,
        ),

      url:
        this.scoreUrl(
          deal.url,
          issues,
        ),

      expiry:
        this.scoreExpiry(
          deal.expiresAt,
          issues,
        ),
    };

    const score =
      this.clamp(
        Math.round(
          Object.values(
            breakdown,
          ).reduce(
            (
              total,
              value,
            ) => total + value,
            0,
          ),
        ),
        0,
        100,
      );

    return {
      score,
      grade:
        this.grade(score),

      publishable:
        score >=
        this.minimumPublishableScore,

      breakdown,
      issues,
    };
  }

  scoreMany<T extends DealQualityInput>(
    deals: readonly T[],
  ): Array<{
    deal: T;
    quality: DealQualityResult;
  }> {
    return deals
      .map(
        deal => ({
          deal,
          quality:
            this.score(deal),
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.quality.score -
          left.quality.score,
      );
  }

  private scoreTitle(
    title: string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    const normalized =
      title?.trim() ?? "";

    if (!normalized) {
      this.addIssue(
        issues,
        "missing_title",
        "title",
        "Deal title is missing",
        MAXIMUM_BREAKDOWN.title,
      );

      return 0;
    }

    if (normalized.length < 10) {
      this.addIssue(
        issues,
        "short_title",
        "title",
        "Deal title is too short",
        8,
      );

      return 7;
    }

    if (normalized.length > 180) {
      this.addIssue(
        issues,
        "long_title",
        "title",
        "Deal title is excessively long",
        5,
      );

      return 10;
    }

    return MAXIMUM_BREAKDOWN.title;
  }

  private scoreRetailer(
    retailer: string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (!retailer?.trim()) {
      this.addIssue(
        issues,
        "missing_retailer",
        "retailer",
        "Retailer is missing",
        MAXIMUM_BREAKDOWN.retailer,
      );

      return 0;
    }

    return MAXIMUM_BREAKDOWN.retailer;
  }

  private scoreCategory(
    category: string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (!category?.trim()) {
      this.addIssue(
        issues,
        "missing_category",
        "category",
        "Category is missing",
        MAXIMUM_BREAKDOWN.category,
      );

      return 0;
    }

    return MAXIMUM_BREAKDOWN.category;
  }

  private scorePricing(
    currentPrice: number | null | undefined,
    originalPrice: number | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (
      !this.isPositiveFiniteNumber(
        currentPrice,
      )
    ) {
      this.addIssue(
        issues,
        "invalid_current_price",
        "currentPrice",
        "Current price must be greater than zero",
        MAXIMUM_BREAKDOWN.pricing,
      );

      return 0;
    }

    if (
      originalPrice === null ||
      originalPrice === undefined
    ) {
      this.addIssue(
        issues,
        "missing_original_price",
        "originalPrice",
        "Original price is missing",
        5,
      );

      return 15;
    }

    if (
      !this.isPositiveFiniteNumber(
        originalPrice,
      )
    ) {
      this.addIssue(
        issues,
        "invalid_original_price",
        "originalPrice",
        "Original price must be greater than zero",
        10,
      );

      return 10;
    }

    if (originalPrice < currentPrice) {
      this.addIssue(
        issues,
        "price_inversion",
        "originalPrice",
        "Original price is lower than current price",
        15,
      );

      return 5;
    }

    return MAXIMUM_BREAKDOWN.pricing;
  }

  private scoreDiscount(
    currentPrice: number | null | undefined,
    originalPrice: number | null | undefined,
    discountPercentage: number | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    const discount =
      this.resolveDiscountPercentage(
        currentPrice,
        originalPrice,
        discountPercentage,
      );

    if (discount === null) {
      this.addIssue(
        issues,
        "missing_discount",
        "discountPercentage",
        "Discount could not be determined",
        MAXIMUM_BREAKDOWN.discount,
      );

      return 0;
    }

    if (
      discount <= 0 ||
      discount >= 100
    ) {
      this.addIssue(
        issues,
        "invalid_discount",
        "discountPercentage",
        "Discount must be between 0 and 100",
        MAXIMUM_BREAKDOWN.discount,
      );

      return 0;
    }

    if (discount < 5) {
      this.addIssue(
        issues,
        "weak_discount",
        "discountPercentage",
        "Discount is below 5 percent",
        10,
      );

      return 5;
    }

    if (discount < 10) {
      this.addIssue(
        issues,
        "low_discount",
        "discountPercentage",
        "Discount is below 10 percent",
        5,
      );

      return 10;
    }

    return MAXIMUM_BREAKDOWN.discount;
  }

  private scoreImage(
    imageUrl: string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (!imageUrl?.trim()) {
      this.addIssue(
        issues,
        "missing_image",
        "imageUrl",
        "Deal image is missing",
        MAXIMUM_BREAKDOWN.image,
      );

      return 0;
    }

    if (
      !this.isValidHttpUrl(
        imageUrl,
      )
    ) {
      this.addIssue(
        issues,
        "invalid_image_url",
        "imageUrl",
        "Deal image URL is invalid",
        MAXIMUM_BREAKDOWN.image,
      );

      return 0;
    }

    return MAXIMUM_BREAKDOWN.image;
  }

  private scoreUrl(
    url: string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (!url?.trim()) {
      this.addIssue(
        issues,
        "missing_url",
        "url",
        "Deal URL is missing",
        MAXIMUM_BREAKDOWN.url,
      );

      return 0;
    }

    if (
      !this.isValidHttpUrl(url)
    ) {
      this.addIssue(
        issues,
        "invalid_url",
        "url",
        "Deal URL is invalid",
        MAXIMUM_BREAKDOWN.url,
      );

      return 0;
    }

    return MAXIMUM_BREAKDOWN.url;
  }

  private scoreExpiry(
    expiresAt: Date | string | null | undefined,
    issues: DealQualityIssue[],
  ): number {
    if (!expiresAt) {
      this.addIssue(
        issues,
        "missing_expiry",
        "expiresAt",
        "Deal expiry is missing",
        MAXIMUM_BREAKDOWN.expiry,
      );

      return 0;
    }

    const expiry =
      new Date(expiresAt);

    if (
      Number.isNaN(
        expiry.getTime(),
      )
    ) {
      this.addIssue(
        issues,
        "invalid_expiry",
        "expiresAt",
        "Deal expiry is invalid",
        MAXIMUM_BREAKDOWN.expiry,
      );

      return 0;
    }

    if (
      expiry.getTime() <=
      this.now.getTime()
    ) {
      this.addIssue(
        issues,
        "expired_deal",
        "expiresAt",
        "Deal has already expired",
        MAXIMUM_BREAKDOWN.expiry,
      );

      return 0;
    }

    const remainingHours =
      (
        expiry.getTime() -
        this.now.getTime()
      ) /
      3_600_000;

    if (remainingHours < 6) {
      this.addIssue(
        issues,
        "near_expiry",
        "expiresAt",
        "Deal expires in less than six hours",
        5,
      );

      return 5;
    }

    return MAXIMUM_BREAKDOWN.expiry;
  }

  private resolveDiscountPercentage(
    currentPrice: number | null | undefined,
    originalPrice: number | null | undefined,
    discountPercentage: number | null | undefined,
  ): number | null {
    if (
      typeof discountPercentage ===
        "number" &&
      Number.isFinite(
        discountPercentage,
      )
    ) {
      return discountPercentage;
    }

    if (
      !this.isPositiveFiniteNumber(
        currentPrice,
      ) ||
      !this.isPositiveFiniteNumber(
        originalPrice,
      ) ||
      originalPrice <= currentPrice
    ) {
      return null;
    }

    return (
      (
        originalPrice -
        currentPrice
      ) /
      originalPrice
    ) * 100;
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

  private isValidHttpUrl(
    value: string,
  ): boolean {
    try {
      const url =
        new URL(value);

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  }

  private grade(
    score: number,
  ): DealQualityGrade {
    if (score >= 90) {
      return "excellent";
    }

    if (score >= 75) {
      return "good";
    }

    if (score >= 60) {
      return "fair";
    }

    return "poor";
  }

  private addIssue(
    issues: DealQualityIssue[],
    code: string,
    field: keyof DealQualityInput,
    message: string,
    penalty: number,
  ): void {
    issues.push({
      code,
      field,
      message,
      penalty,
    });
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
