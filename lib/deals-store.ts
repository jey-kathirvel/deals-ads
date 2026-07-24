import { promises as fs } from "node:fs";
import path from "node:path";
import type { Deal } from "./deal-types";
import { slugify } from "./slug";

const dataDir = process.env.DEALS_DATA_DIR || path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "deals.json");
const seedFile = path.join(process.cwd(), "seed", "deals.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    try { await fs.copyFile(seedFile, dataFile); }
    catch { await fs.writeFile(dataFile, "[]", "utf8"); }
  }
}

export async function getDeals(includeInactive = false): Promise<Deal[]> {
  await ensureStore();
  const raw = JSON.parse(await fs.readFile(dataFile, "utf8")) as Deal[];
  const normalized = raw.map((item) => normalizeDeal(item));
  const { items, removed } = removeStalePublishedDeals(normalized);

  // Cleanup happens during normal reads, so expired storefront records cannot
  // accumulate even when an external scheduler is unavailable.
  if (removed > 0) await writeDeals(items);

  return items
    .filter((item) => includeInactive || isPublicDeal(item))
    .sort((a, b) => b.id - a.id);
}

export async function cleanupDeals() {
  await ensureStore();
  const raw = JSON.parse(await fs.readFile(dataFile, "utf8")) as Deal[];
  const normalized = raw.map((item) => normalizeDeal(item));
  const result = removeStalePublishedDeals(normalized);
  if (result.removed > 0) await writeDeals(result.items);
  return { removed: result.removed, remaining: result.items.length, cleanedAt: new Date().toISOString() };
}

export async function saveDeal(input: Partial<Deal> & Pick<Deal, "title" | "platform" | "category" | "price" | "mrp" | "url">) {
  const items = await getDeals(true);
  const existing = input.id ? items.find((item) => item.id === input.id) : undefined;
  const deal: Deal = {
    id: existing?.id ?? Math.max(0, ...items.map((item) => item.id)) + 1,
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
  const next = existing ? items.map((item) => item.id === deal.id ? deal : item) : [deal, ...items];
  await writeDeals(next);
  return deal;
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

export async function getDealBySlug(slug: string): Promise<Deal | null> {
  const normalizedSlug = slugify(decodeURIComponent(slug));
  const deals = await getDeals();

  return (
    deals.find((deal) => getDealSlug(deal) === normalizedSlug) ??
    null
  );
}

export async function getRelatedDeals(
  deal: Deal,
  limit = 4,
): Promise<Deal[]> {
  const safeLimit = Math.max(0, Math.floor(limit));
  const deals = await getDeals();

  const sameCategory = deals.filter(
    (item) =>
      item.id !== deal.id &&
      item.category.toLowerCase() === deal.category.toLowerCase(),
  );

  const remaining = deals.filter(
    (item) =>
      item.id !== deal.id &&
      item.category.toLowerCase() !== deal.category.toLowerCase(),
  );

  return [...sameCategory, ...remaining].slice(0, safeLimit);
}


export async function getPublishedDeals() {
  const deals = await getDeals();

  return deals
    .filter(
      (deal) =>
        deal.status === "published" &&
        deal.active,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime(),
    );
}

export async function deleteDeal(id: number) {
  const items = await getDeals(true);
  await writeDeals(items.filter((item) => item.id !== id));
}

async function writeDeals(items: Deal[]) {
  await ensureStore();
  const temporary = `${dataFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(temporary, dataFile);
}
