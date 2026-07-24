import { slugify } from "@/lib/slug";

export type CatalogDeal = {
  title: string;
  category?: string | null;
  platform?: string | null;
  status?: string | null;
  active?: boolean | null;
  rating?: number | null;
  price?: number | null;
  mrp?: number | null;
  updatedAt?: string | null;
};

export type CatalogCategory = {
  name: string;
  slug: string;
  count: number;
};

const FALLBACK_CATEGORY = "Other Deals";

export function normalizeCategory(
  category: string | null | undefined,
): string {
  const value = category?.trim();

  if (!value) {
    return FALLBACK_CATEGORY;
  }

  return value;
}

export function categorySlug(
  category: string | null | undefined,
): string {
  return slugify(normalizeCategory(category));
}

export function getDealCategories<T extends CatalogDeal>(
  deals: readonly T[],
): CatalogCategory[] {
  const counts = new Map<string, number>();

  for (const deal of deals) {
    const name = normalizeCategory(deal.category);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      slug: categorySlug(name),
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.name.localeCompare(b.name);
    });
}

export function getDealsByCategory<T extends CatalogDeal>(
  deals: readonly T[],
  requestedSlug: string,
): T[] {
  const normalizedSlug = requestedSlug.trim().toLowerCase();

  return deals.filter(
    (deal) => categorySlug(deal.category) === normalizedSlug,
  );
}

export function getCategoryNameBySlug<T extends CatalogDeal>(
  deals: readonly T[],
  requestedSlug: string,
): string | null {
  const normalizedSlug = requestedSlug.trim().toLowerCase();

  for (const deal of deals) {
    const name = normalizeCategory(deal.category);

    if (categorySlug(name) === normalizedSlug) {
      return name;
    }
  }

  return null;
}

export function getTrendingDeals<T extends CatalogDeal>(
  deals: readonly T[],
  limit = 8,
): T[] {
  return [...deals]
    .sort((a, b) => {
      const ratingDifference = (b.rating ?? 0) - (a.rating ?? 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      const aDiscount =
        a.mrp && a.price && a.mrp > 0
          ? ((a.mrp - a.price) / a.mrp) * 100
          : 0;

      const bDiscount =
        b.mrp && b.price && b.mrp > 0
          ? ((b.mrp - b.price) / b.mrp) * 100
          : 0;

      if (bDiscount !== aDiscount) {
        return bDiscount - aDiscount;
      }

      return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "");
    })
    .slice(0, Math.max(0, limit));
}
