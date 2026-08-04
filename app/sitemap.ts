import type { MetadataRoute } from "next";

import { getDealCategories } from "@/lib/catalog";
import { getDealSlug, getPublishedDeals } from "@/lib/deals-store";

const SITE_URL = "https://deals.ads-ai.in";

export const dynamic = "force-dynamic";

function validDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getPublishedDeals();
  const categories = getDealCategories(deals);
  const seenDealUrls = new Set<string>();
  const dealEntries: MetadataRoute.Sitemap = [];

  for (const deal of deals) {
    const url = `${SITE_URL}/deal/${getDealSlug(deal)}`;
    if (seenDealUrls.has(url)) continue;
    seenDealUrls.add(url);
    dealEntries.push({
      url,
      lastModified: validDate(deal.updatedAt || deal.importedAt),
      changeFrequency: "daily",
      priority: 0.8,
      images: deal.imageUrl ? [deal.imageUrl] : undefined,
    });
  }

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/editorial-policy`,
      lastModified: new Date("2026-07-31"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-07-31"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date("2026-07-31"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...(categories.map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: category.slug === "grocery" ? 0.95 : 0.9,
    })) satisfies MetadataRoute.Sitemap),
    ...dealEntries,
  ];
}
