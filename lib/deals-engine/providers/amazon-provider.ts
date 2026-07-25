import {
  searchAmazonItems,
  type AmazonProduct,
} from "../../amazon/creators-api";

import type {
  DiscoveryProvider,
  DiscoveryResult,
} from "./provider";

import type { Deal } from "../models/deal";

export type AmazonProviderOptions = {
  keywords: string[];
  searchIndex?: string;
  minimumDiscountPercent?: number;
  minimumRating?: number;
  itemCountPerKeyword?: number;
  requestDelayMs?: number;
};

export type AmazonDiscoveryFailure = {
  keyword: string;
  error: string;
};

export type AmazonProviderMetrics = {
  keywords: number;
  discovered: number;
  unique: number;
  accepted: number;
  rejected: number;
  failures: number;
};

function calculateDiscountPercent(
  product: AmazonProduct,
): number {
  if (
    product.mrp <= 0 ||
    product.price <= 0 ||
    product.price >= product.mrp
  ) {
    return 0;
  }

  return Math.round(
    ((product.mrp - product.price) / product.mrp) * 100,
  );
}

function parseExpiryDate(
  value: string,
): Date | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function normalizeKeywords(
  keywords: string[],
): string[] {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(1, Math.floor(parsed)),
  );
}

function nonNegativeNumber(
  value: number | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : fallback;
}

function toDeal(
  product: AmazonProduct,
  discoveredAt: Date,
): Deal {
  const discountPercent =
    calculateDiscountPercent(product);

  const expiresAt =
    parseExpiryDate(product.expiresAt);

  return {
    id: `amazon:${product.asin}`,

    platform: "Amazon",
    category:
      product.category.trim() || "General",

    title: product.title.trim(),
    description:
      discountPercent > 0
        ? `${discountPercent}% discount on Amazon`
        : "Amazon deal",

    imageUrl: product.imageUrl,
    dealUrl: product.detailPageUrl,

    currentPrice: product.price,
    originalPrice:
      product.mrp > 0
        ? product.mrp
        : undefined,

    discountPercent,

    rating:
      product.rating > 0
        ? product.rating
        : undefined,

    reviewCount:
      product.votes > 0
        ? product.votes
        : undefined,

    currency: "INR",

    expiresAt,
    status: "ACTIVE",

    discoveredAt,

    metadata: {
      provider: "amazon-creators-api",
      source: "amazon",
      asin: product.asin,
      sourceUrl: product.detailPageUrl,
      rawExpiresAt: product.expiresAt || null,
    },
  };
}

export class AmazonDiscoveryProvider
implements DiscoveryProvider {
  readonly id = "amazon";
  readonly name = "Amazon Creators API";
  readonly enabled: boolean;

  private readonly keywords: string[];
  private readonly searchIndex: string;
  private readonly minimumDiscountPercent: number;
  private readonly minimumRating: number;
  private readonly itemCountPerKeyword: number;
  private readonly requestDelayMs: number;

  private failures: AmazonDiscoveryFailure[] = [];

  private metrics: AmazonProviderMetrics = {
    keywords: 0,
    discovered: 0,
    unique: 0,
    accepted: 0,
    rejected: 0,
    failures: 0,
  };

  constructor(options: AmazonProviderOptions) {
    this.keywords =
      normalizeKeywords(options.keywords);

    this.searchIndex =
      options.searchIndex?.trim() || "All";

    this.minimumDiscountPercent =
      nonNegativeNumber(
        options.minimumDiscountPercent,
        10,
      );

    this.minimumRating =
      nonNegativeNumber(
        options.minimumRating,
        3.5,
      );

    this.itemCountPerKeyword =
      positiveInteger(
        options.itemCountPerKeyword,
        10,
        10,
      );

    this.requestDelayMs =
      nonNegativeNumber(
        options.requestDelayMs,
        1100,
      );

    this.enabled = this.keywords.length > 0;
  }

  getFailures(): AmazonDiscoveryFailure[] {
    return this.failures.map((failure) => ({
      ...failure,
    }));
  }

  getMetrics(): AmazonProviderMetrics {
    return {
      ...this.metrics,
    };
  }

  async discover(): Promise<DiscoveryResult> {
    if (!this.enabled) {
      throw new Error(
        "At least one Amazon discovery keyword is required.",
      );
    }

    this.failures = [];

    const discovered: AmazonProduct[] = [];

    for (
      let index = 0;
      index < this.keywords.length;
      index += 1
    ) {
      const keyword = this.keywords[index];

      try {
        const products = await searchAmazonItems({
          keywords: keyword,
          searchIndex: this.searchIndex,
          itemCount: this.itemCountPerKeyword,
        });

        discovered.push(...products);
      } catch (error) {
        this.failures.push({
          keyword,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }

      const hasMoreKeywords =
        index < this.keywords.length - 1;

      if (
        hasMoreKeywords &&
        this.requestDelayMs > 0
      ) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, this.requestDelayMs);
        });
      }
    }

    const uniqueProducts =
      new Map<string, AmazonProduct>();

    for (const product of discovered) {
      if (!product.asin.trim()) {
        continue;
      }

      uniqueProducts.set(product.asin, product);
    }

    const acceptedProducts =
      [...uniqueProducts.values()].filter(
        (product) => {
          const discountPercent =
            calculateDiscountPercent(product);

          /*
           * Amazon may omit ratings for otherwise valid
           * products. Preserve the existing discovery
           * behaviour by applying the minimum threshold
           * only when a positive rating is available.
           */
          const ratingForFilter =
            product.rating > 0
              ? product.rating
              : this.minimumRating;

          return (
            discountPercent >=
              this.minimumDiscountPercent &&
            ratingForFilter >=
              this.minimumRating
          );
        },
      );

    const discoveredAt = new Date();

    const deals = acceptedProducts.map(
      (product) =>
        toDeal(product, discoveredAt),
    );

    this.metrics = {
      keywords: this.keywords.length,
      discovered: discovered.length,
      unique: uniqueProducts.size,
      accepted: deals.length,
      rejected:
        uniqueProducts.size - deals.length,
      failures: this.failures.length,
    };

    return {
      deals,
      coupons: [],
    };
  }
}
