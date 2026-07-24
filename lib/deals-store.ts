import type { Deal } from "./deal-types";
import {
  deleteLegacyDeal,
  getLegacyDeals,
  persistLegacyDeal,
} from "@/lib/deals-engine/repositories/deals-compat";
import { slugify } from "./slug";
import { runDailyDealLifecycle } from "@/lib/deals-engine/core/lifecycle";

export async function getDeals(includeInactive = false): Promise<Deal[]> {
  const deals = await getLegacyDeals();

  if (includeInactive) {
    return deals;
  }

  return deals.filter(d => d.active);
}

export async function cleanupDeals() {
  return runDailyDealLifecycle();
}

export async function saveDeal(input: Partial<Deal> & Pick<Deal, "title" | "platform" | "category" | "price" | "mrp" | "url">) {
  const items = await getDeals(true);
  const existing = input.id ? items.find((item) => item.id === input.id) : undefined;
  const deal: Deal = {
    id: existing?.id ?? 0,
    title: input.title.trim(), platform: input.platform.trim(), category: input.category,
    price: Number(input.price), mrp: Number(input.mrp), rating: Number(input.rating ?? 4.5),
    votes: Number(input.votes ?? 0), tag: input.tag?.trim() || "New deal", color: input.color || "#e7f1ec",
    emoji: input.emoji || "DEAL", imageUrl: input.imageUrl?.trim() || "", code: input.code?.trim() || "", expires: input.expires?.trim() || "Limited time",
    url: affiliateUrl(input.url.trim(), input.platform), active: input.active ?? existing?.active ?? true, source: input.source || existing?.source || "manual",
    status: input.status || existing?.status || "published", expiryDate: input.expiryDate || existing?.expiryDate || "",
    couponTerms: input.couponTerms?.trim() || existing?.couponTerms || "", sourceUrl: input.sourceUrl?.trim() || existing?.sourceUrl || input.url.trim(),
    lastCheckedAt: input.lastCheckedAt || new Date().toISOString(), importedAt: existing?.importedAt || input.importedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return persistLegacyDeal(deal);
}

function normalizeDeal(item: Deal): Deal {
  const status = item.status || (item.active ? "published" : "draft");
  const expired = hasExpired(item.expiryDate);
  return {
    ...item, imageUrl: item.imageUrl || "", status: expired ? "expired" : status,
    expiryDate: item.expiryDate || "", couponTerms: item.couponTerms || "",
    sourceUrl: item.sourceUrl || item.url, lastCheckedAt: item.lastCheckedAt || item.updatedAt,
    importedAt: item.importedAt || item.updatedAt,
  };
}

function isPublicDeal(item: Deal) {
  return item.active && item.status === "published" && !hasExpired(item.expiryDate);
}

function removeStalePublishedDeals(items: Deal[]) {
  let removed = 0;
  const activeItems = items.filter((item) => {
    // Draft and review records may intentionally be inactive and must remain in
    // the admin workflow. Only stale records that reached publication are purged.
    const expired = item.status === "expired" || hasExpired(item.expiryDate);
    const inactivePublished = item.status === "published" && !item.active;
    const shouldRemove = expired || inactivePublished;
    if (shouldRemove) removed += 1;
    return !shouldRemove;
  });
  return { items: activeItems, removed };
}

function hasExpired(expiryDate?: string) {
  if (!expiryDate) return false;
  const expiry = expiryTimestamp(expiryDate);
  return Number.isFinite(expiry) && expiry < Date.now();
}

function expiryTimestamp(value: string) {
  // A date-only value remains valid through the end of that calendar day in
  // India, instead of expiring at UTC midnight at the beginning of the date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59.999+05:30`).getTime();
  return new Date(value).getTime();
}

export async function importDeals(rows: Array<Record<string, string>>, options: { publish?: boolean; source?: Deal["source"] } = {}) {
  if (rows.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      errors: [],
    };
  }

  const items = await getDeals(true);
  const seenUrls = new Set(items.map((item) => canonical(item.url)));
  const seenTitles = new Set(items.map((item) => `${item.platform.toLowerCase()}|${item.title.toLowerCase().replace(/\W/g, "")}`));
  const imported: Deal[] = [];
  const errors: string[] = [];
  let skipped = 0;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const title = row.title?.trim(); const platform = row.platform?.trim(); const url = row.url?.trim();
    const price = Number(row.price); const mrp = Number(row.mrp);
    if (!title || !platform || !url || !Number.isFinite(price) || !Number.isFinite(mrp) || mrp <= 0) { errors.push(`Row ${index + 2}: missing or invalid required fields.`); continue; }
    const titleKey = `${platform.toLowerCase()}|${title.toLowerCase().replace(/\W/g, "")}`;
    if (seenUrls.has(canonical(url)) || seenTitles.has(titleKey)) { skipped++; continue; }
    const deal = await saveDeal({
      title, platform, url, price, mrp, category: row.category || "Electronics", imageUrl: row.imageUrl || row.image || "",
      tag: row.tag || "Imported deal", code: row.code || row.coupon || "", couponTerms: row.couponTerms || row.terms || "",
      expires: row.expires || "Limited time", expiryDate: row.expiryDate || "", rating: Number(row.rating || 4.5),
      votes: Number(row.votes || 0), active: options.publish ?? false, status: options.publish ? "published" : "review", source: options.source || "csv", sourceUrl: row.sourceUrl || url,
    });
    imported.push(deal); seenUrls.add(canonical(deal.url)); seenTitles.add(titleKey);
  }
  return { imported: imported.length, skipped, errors };
}

function canonical(value: string) {
  try { const url = new URL(value); return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.replace(/\/$/, "").toLowerCase(); }
  catch { return value.toLowerCase().split("?")[0]; }
}

function affiliateUrl(value: string, platform: string) {
  if (platform.toLowerCase() !== "amazon" || !process.env.AMAZON_PARTNER_TAG) return value;
  try {
    const url = new URL(value);
    if (url.hostname === "amazon.in" || url.hostname.endsWith(".amazon.in")) url.searchParams.set("tag", process.env.AMAZON_PARTNER_TAG);
    return url.toString();
  } catch { return value; }
}

export function getDealSlug(deal: Pick<Deal, "title">): string {
  return slugify(deal.title);
}

export async function getDealBySlug(
  slug: string
): Promise<Deal | null> {
  const deals = await getLegacyDeals();

  return (
    deals.find(
      d =>
        getDealSlug(d) === slug
    ) ?? null
  );
}

export async function getRelatedDeals(
  deal: Deal,
  limit = 4
): Promise<Deal[]> {
  const deals = await getLegacyDeals();

  return deals
    .filter(
      d =>
        d.id !== deal.id &&
        d.category === deal.category &&
        d.active
    )
    .slice(0, limit);
}

export async function getPublishedDeals() {
  const deals = await getLegacyDeals();

  return deals.filter(
    d => d.active && d.status === "published"
  );
}

export async function deleteDeal(id: number) {
  await deleteLegacyDeal(id);
}

