import type { MetadataRoute } from "next";

import { getDealCategories } from "@/lib/catalog";
import { getPublishedDeals } from "@/lib/deals-store";
import { slugify } from "@/lib/slug";

const SITE_URL = "https://deals.ads-ai.in";

function validDate(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getPublishedDeals();
  const categories = getDealCategories(deals);

  const staticRoutes: MetadataRoute.Sitemap = [
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
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(
    (category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    }),
  );

  const dealRoutes: MetadataRoute.Sitemap = deals.map((deal) => ({
    url: `${SITE_URL}/deal/${slugify(deal.title)}`,
    lastModified: validDate(deal.updatedAt),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...dealRoutes];
}
