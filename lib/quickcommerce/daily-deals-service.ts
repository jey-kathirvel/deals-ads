import type { Deal } from "@/lib/deal-types";
import {
  cleanupDeals,
  deleteDeal,
  getDeals,
  importDeals,
} from "@/lib/deals-store";
import {
  QuickCommerceClient,
  QuickCommerceHttpError,
  type QuickCommerceProduct,
} from "./client";

export interface QuickCommerceDailyOptions {
  limit: number;
  minimumDiscountPercent: number;
  keywords: string[];
  platforms: string[];
  latitude: number;
  longitude: number;
  pincode?: string;
}

export interface QuickCommerceDailyResult {
  discovered: number;
  eligible: number;
  imported: number;
  skipped: number;
  importErrors: string[];
  checked: number;
  deleted: number;
  retainedOnError: number;
  providerFailures: string[];
}

function discount(product: QuickCommerceProduct): number {
  if (
    product.mrp <= 0 ||
    product.offerPrice <= 0 ||
    product.offerPrice >= product.mrp
  ) {
    return 0;
  }
  return Math.round(((product.mrp - product.offerPrice) / product.mrp) * 100);
}

function categoryFor(keyword: string): string {
  const normalized = keyword.toLowerCase();
  if (/beauty|skin|makeup/.test(normalized)) return "Beauty";
  if (/fashion|shoe|watch/.test(normalized)) return "Fashion";
  if (/home|kitchen|appliance/.test(normalized)) return "Home";
  if (/grocery|food|snack/.test(normalized)) return "Food";
  if (/mobile|laptop|headphone|electronics/.test(normalized))
    return "Electronics";
  return "Other Deals";
}

function key(product: QuickCommerceProduct): string {
  return `${product.platform.toLowerCase()}|${product.id.toLowerCase()}`;
}

function publicationIdentity(product: QuickCommerceProduct): {
  url: string;
  title: string;
} {
  let url = product.deeplink.toLowerCase();
  try {
    const parsed = new URL(product.deeplink);
    url = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    // The deal validator rejects malformed URLs before persistence.
  }
  return {
    url,
    title: `${product.platform.toLowerCase()}|${product.name
      .toLowerCase()
      .replace(/\W/g, "")}`,
  };
}

function toRow(
  product: QuickCommerceProduct,
  category: string,
): Record<string, string> {
  const saving = discount(product);
  return {
    title: product.name,
    platform: product.platform,
    category,
    price: String(product.offerPrice),
    mrp: String(product.mrp),
    rating: String(product.rating),
    votes: String(product.ratingCount),
    tag: `${saving}% OFF`,
    imageUrl: product.images[0] ?? "",
    expires: "Availability checked daily",
    url: product.deeplink,
    sourceUrl: product.deeplink,
    providerItemId: product.id,
    providerPlatform: product.platform,
  };
}

function validationIdentity(
  deal: Deal,
): { itemId: string; platform: string } | null {
  if (deal.source !== "quickcommerce") return null;
  if (!deal.providerItemId || !deal.providerPlatform) return null;
  return { itemId: deal.providerItemId, platform: deal.providerPlatform };
}

export class QuickCommerceDailyDealsService {
  constructor(private readonly client: QuickCommerceClient) {}

  async run(
    options: QuickCommerceDailyOptions,
  ): Promise<QuickCommerceDailyResult> {
    const candidates = new Map<
      string,
      { product: QuickCommerceProduct; category: string }
    >();
    const providerFailures: string[] = [];

    for (const keyword of options.keywords) {
      for (const platform of options.platforms) {
        try {
          const products = await this.client.search({
            query: keyword,
            platform,
            latitude: options.latitude,
            longitude: options.longitude,
            pincode: options.pincode,
          });
          for (const product of products) {
            if (
              product.available &&
              product.images.length > 0 &&
              product.offerPrice > 0 &&
              discount(product) >= options.minimumDiscountPercent
            ) {
              candidates.set(key(product), {
                product,
                category: categoryFor(keyword),
              });
            }
          }
        } catch (error) {
          providerFailures.push(
            `${platform}/${keyword}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    const existing = await getDeals(true);
    const publicationUrls = new Set<string>();
    const publicationTitles = new Set<string>();
    for (const deal of existing) {
      const identity = publicationIdentity({
        id: String(deal.id),
        name: deal.title,
        brand: "",
        available: deal.active,
        images: deal.imageUrl ? [deal.imageUrl] : [],
        mrp: deal.mrp,
        offerPrice: deal.price,
        deeplink: deal.url,
        rating: deal.rating,
        ratingCount: deal.votes,
        inventory: null,
        rank: 0,
        platform: deal.platform,
      });
      publicationUrls.add(identity.url);
      publicationTitles.add(identity.title);
    }

    const rankedCandidates = [...candidates.values()].sort((left, right) => {
      const discountDifference =
        discount(right.product) - discount(left.product);
      if (discountDifference !== 0) return discountDifference;
      const ratingDifference = right.product.rating - left.product.rating;
      if (ratingDifference !== 0) return ratingDifference;
      return key(left.product).localeCompare(key(right.product));
    });
    const ranked = rankedCandidates
      .filter(({ product }) => {
        const identity = publicationIdentity(product);
        if (
          publicationUrls.has(identity.url) ||
          publicationTitles.has(identity.title)
        )
          return false;
        publicationUrls.add(identity.url);
        publicationTitles.add(identity.title);
        return true;
      })
      .slice(0, Math.max(1, Math.min(50, options.limit)));

    const importResult = await importDeals(
      ranked.map(({ product, category }) => toRow(product, category)),
      { publish: true, source: "quickcommerce" },
    );

    let checked = 0;
    let deleted = 0;
    let retainedOnError = 0;
    for (const deal of existing) {
      const identity = validationIdentity(deal);
      if (!identity) continue;
      checked += 1;
      try {
        const current = await this.client.item({
          ...identity,
          latitude: options.latitude,
          longitude: options.longitude,
          pincode: options.pincode,
        });
        if (current && (!current.available || current.offerPrice <= 0)) {
          await deleteDeal(deal.id);
          deleted += 1;
        }
      } catch (error) {
        /*
         * A missing item or temporary provider error is not sufficient proof
         * that an existing deal is inactive. Keep the deal unless the provider
         * explicitly returns it as unavailable or invalid.
         */
        if (error instanceof QuickCommerceHttpError && error.status === 404) {
          retainedOnError += 1;
        } else {
          retainedOnError += 1;
        }
      }
    }

    /*
     * Hard-delete only deals already confirmed as expired or inactive.
     * Active deals are retained even when absent from the latest search result.
     */
    const lifecycleResult = await cleanupDeals();
    deleted += lifecycleResult.deletedUnsavedDeals;

    return {
      discovered: candidates.size,
      eligible: ranked.length,
      imported: importResult.imported,
      skipped: importResult.skipped,
      importErrors: importResult.errors,
      checked,
      deleted,
      retainedOnError,
      providerFailures,
    };
  }
}

export function quickCommerceOptionsFromEnvironment(): QuickCommerceDailyOptions {
  const split = (value: string | undefined, fallback: string[]) =>
    (value?.split(",") ?? fallback).map((item) => item.trim()).filter(Boolean);
  return {
    limit: Number(process.env.QUICKCOMMERCE_DAILY_LIMIT ?? "50"),
    minimumDiscountPercent: Number(
      process.env.QUICKCOMMERCE_MINIMUM_DISCOUNT ?? "10",
    ),

    keywords: split(process.env.QUICKCOMMERCE_KEYWORDS, [
      // Existing
      "headphones",
      "smart watches",
      "kitchen appliances",
      "fashion",

      // Mobiles
      "mobiles",
      "smartphone",
      "iphone",
      "samsung galaxy",
      "oneplus",
      "realme",
      "redmi",
      "vivo",
      "oppo",
      "poco",

      // TVs
      "tv",
      "smart tv",
      "android tv",
      "led tv",
      "qled tv",
      "oled tv",
      "4k tv",

      // Computers
      "laptop",
      "gaming laptop",
      "ultrabook",
      "notebook",
      "desktop",
      "computer",
      "monitor",

      // Accessories
      "keyboard",
      "mouse",
      "webcam",
      "printer",
      "ssd",
      "hard disk",
      "power bank",
      "charger",
      "earbuds",
      "bluetooth speaker",
      "wifi router",
    ]),

    platforms: split(process.env.QUICKCOMMERCE_PLATFORMS, [
      "Amazon",
      "Flipkart",
      "Myntra",
      "Nykaa",
      "BlinkIt",
    ]),
    latitude: Number(process.env.QUICKCOMMERCE_LATITUDE ?? "12.9716"),
    longitude: Number(process.env.QUICKCOMMERCE_LONGITUDE ?? "77.5946"),
    pincode: process.env.QUICKCOMMERCE_PINCODE?.trim() || undefined,
  };
}
