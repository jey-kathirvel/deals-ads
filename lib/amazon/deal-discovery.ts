import {
  searchAmazonItems,
  type AmazonProduct,
} from "./creators-api";

import {
  importDeals,
} from "../deals-store";

export type AmazonDiscoveryOptions = {
  keywords: string[];
  searchIndex?: string;
  minimumDiscountPercent?: number;
  minimumRating?: number;
  publish?: boolean;
  dryRun?: boolean;
};

type DiscoveryCandidate = {
  asin: string;
  title: string;
  platform: string;
  category: string;
  price: string;
  mrp: string;
  rating: string;
  votes: string;
  tag: string;
  imageUrl: string;
  expires: string;
  expiryDate: string;
  url: string;
  sourceUrl: string;
};

function discountPercent(product: AmazonProduct): number {
  if (product.mrp <= 0 || product.price >= product.mrp) {
    return 0;
  }

  return Math.round(
    ((product.mrp - product.price) / product.mrp) * 100,
  );
}

function toCandidate(product: AmazonProduct): DiscoveryCandidate {
  const discount = discountPercent(product);

  return {
    asin: product.asin,
    title: product.title,
    platform: "Amazon",
    category: product.category,
    price: String(product.price),
    mrp: String(product.mrp),
    rating: String(product.rating || 0),
    votes: String(product.votes || 0),
    tag: discount > 0
      ? `${discount}% OFF`
      : "Amazon deal",
    imageUrl: product.imageUrl,
    expires: product.expiresAt
      ? "Deal ends soon"
      : "Limited time",
    expiryDate: product.expiresAt,
    url: product.detailPageUrl,
    sourceUrl: product.detailPageUrl,
  };
}

export async function discoverAmazonDeals(
  options: AmazonDiscoveryOptions,
) {
  const minimumDiscountPercent = Math.max(
    0,
    Number(options.minimumDiscountPercent ?? 10),
  );

  const minimumRating = Math.max(
    0,
    Number(options.minimumRating ?? 3.5),
  );

  const keywords = Array.from(
    new Set(
      options.keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );

  if (keywords.length === 0) {
    throw new Error(
      "At least one Amazon discovery keyword is required.",
    );
  }

  const discovered: AmazonProduct[] = [];
  const failures: Array<{
    keyword: string;
    error: string;
  }> = [];

  for (const keyword of keywords) {
    try {
      const products = await searchAmazonItems({
        keywords: keyword,
        searchIndex: options.searchIndex || "All",
        itemCount: 10,
      });

      discovered.push(...products);
    } catch (error) {
      failures.push({
        keyword,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }

    // Protect the initial Amazon API allocation of one request/second.
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  const unique = new Map<string, AmazonProduct>();

  for (const product of discovered) {
    unique.set(product.asin, product);
  }

  const accepted = [...unique.values()].filter((product) => {
    const discount = discountPercent(product);
    const rating =
      product.rating > 0
        ? product.rating
        : minimumRating;

    return (
      discount >= minimumDiscountPercent &&
      rating >= minimumRating
    );
  });

  const rows = accepted.map(toCandidate);

  if (options.dryRun) {
    return {
      dryRun: true,
      keywords,
      discovered: discovered.length,
      unique: unique.size,
      accepted: rows.length,
      rejected: unique.size - rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      failures,
      candidates: rows,
    };
  }

  const importResult = await importDeals(rows, {
    publish: options.publish ?? false,
    source: "amazon",
  });

  return {
    dryRun: false,
    keywords,
    discovered: discovered.length,
    unique: unique.size,
    accepted: rows.length,
    rejected: unique.size - rows.length,
    imported: importResult.imported,
    skipped: importResult.skipped,
    errors: importResult.errors,
    failures,
    status: options.publish
      ? "published"
      : "review",
  };
}
