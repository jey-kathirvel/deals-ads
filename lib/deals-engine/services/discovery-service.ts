import { DiscoveryEngine } from "../core/discovery-engine";
import { AmazonDiscoveryProvider } from "../providers/amazon-provider";

import { importDeals } from "../../deals-store";

import type { Deal } from "../models/deal";

export type RunAmazonDiscoveryOptions = {
  keywords: string[];
  searchIndex?: string;
  minimumDiscountPercent?: number;
  minimumRating?: number;
  publish?: boolean;
  dryRun?: boolean;
};

function toImportRow(deal: Deal) {
  return {
    title: deal.title,
    platform: deal.platform,
    category: deal.category,

    price: String(deal.currentPrice),
    mrp: String(deal.originalPrice ?? ""),

    rating: String(deal.rating ?? ""),
    votes: String(deal.reviewCount ?? ""),

    tag:
      deal.discountPercent !== undefined
        ? `${deal.discountPercent}% OFF`
        : "",

    imageUrl: deal.imageUrl,

    expires:
      deal.expiresAt
        ? "Deal ends soon"
        : "Limited time",

    expiryDate:
      deal.expiresAt
        ? deal.expiresAt
            .toISOString()
            .substring(0, 10)
        : "",

    url: deal.dealUrl,
    sourceUrl:
      typeof deal.metadata?.sourceUrl === "string"
        ? deal.metadata.sourceUrl
        : deal.dealUrl,
  };
}

export async function runAmazonDiscovery(
  options: RunAmazonDiscoveryOptions,
) {
  const engine = new DiscoveryEngine();

  const provider =
    new AmazonDiscoveryProvider({
      keywords: options.keywords,
      searchIndex: options.searchIndex,
      minimumDiscountPercent:
        options.minimumDiscountPercent,
      minimumRating:
        options.minimumRating,
    });

  engine.register(provider);

  const output = await engine.run();
  const metrics = provider.getMetrics();
  const failures = provider.getFailures();
  const rows = output.deals.map(toImportRow);

  if (options.dryRun) {
    return {
      dryRun: true,

      keywords: options.keywords,

      discovered: metrics.discovered,
      unique: metrics.unique,
      accepted: rows.length,
      rejected: metrics.rejected,

      imported: 0,
      skipped: 0,
      errors: [],

      failures,
      candidates: rows,

      summary: output.summary,
      metrics,
    };
  }

  const importResult = await importDeals(
    rows,
    {
      publish: options.publish ?? false,
      source: "amazon",
    },
  );

  return {
    dryRun: false,

    keywords: options.keywords,

    discovered: metrics.discovered,
    unique: metrics.unique,
    accepted: rows.length,
    rejected: metrics.rejected,

    imported: importResult.imported,
    skipped: importResult.skipped,
    errors: importResult.errors,

    failures,

    status:
      options.publish
        ? "published"
        : "review",

    summary: output.summary,
    metrics,
  };
}
