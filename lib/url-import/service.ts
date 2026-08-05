import crypto from "node:crypto";
import { getDeals, saveDeal } from "@/lib/deals-store";
import { resolveDynamicCategory } from "./category-store";
import { extractProductFromUrl } from "./extractor";
import { getBatch, saveBatch } from "./store";
import type { ImportFailureCode, UrlImportBatch, UrlImportPreviewItem } from "./types";

const FAILURE_MESSAGES: Record<ImportFailureCode, { message: string; retryable: boolean }> = {
  INVALID_URL: { message: "The URL format is invalid.", retryable: false },
  UNSUPPORTED_PLATFORM: { message: "This website is not supported.", retryable: false },
  INVALID_PRODUCT_URL: { message: "This is not a direct product page. Paste a product URL instead of a homepage, category, or search URL.", retryable: false },
  PAGE_NOT_FOUND: { message: "The product page was not found.", retryable: false },
  ACCESS_BLOCKED: { message: "The platform blocked access to the product page.", retryable: true },
  LOGIN_REQUIRED: { message: "The product page requires login.", retryable: false },
  LOCATION_REQUIRED: { message: "The platform requires a delivery location or pincode.", retryable: true },
  PINCODE_NOT_SERVICEABLE: { message: "The selected pincode is not serviceable.", retryable: true },
  PRODUCT_UNAVAILABLE: { message: "The product is currently unavailable.", retryable: true },
  PRICE_NOT_FOUND: { message: "The selling price could not be identified.", retryable: true },
  PRODUCT_NAME_NOT_FOUND: { message: "The product name could not be identified.", retryable: true },
  PRODUCT_IMAGE_NOT_FOUND: { message: "A mandatory product image was not found.", retryable: true },
  PRODUCT_IMAGE_INVALID: { message: "The extracted product image is invalid.", retryable: true },
  PRODUCT_IMAGE_TOO_SMALL: { message: "The product image is too small or appears to be a placeholder.", retryable: true },
  PRODUCT_IMAGE_BLOCKED: { message: "The platform blocked access to the product image.", retryable: true },
  INVALID_PRICE: { message: "The extracted price is invalid.", retryable: true },
  FETCH_TIMEOUT: { message: "The platform did not respond before timeout.", retryable: true },
  RATE_LIMITED: { message: "The platform temporarily rate-limited the request.", retryable: true },
  PARSER_FAILED: { message: "The page structure could not be interpreted.", retryable: true },
  UNSAFE_URL: { message: "The URL resolves to an unsafe or private network address.", retryable: false },
  IMPORT_STOPPED: { message: "The import was stopped manually by an administrator.", retryable: true },
  INTERNAL_ERROR: { message: "An unexpected import error occurred.", retryable: true },
};

function canonical(value: string) {
  try { const url = new URL(value); return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.replace(/\/$/, "").toLowerCase(); }
  catch { return value.toLowerCase().split("?")[0]; }
}

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }

function failureItem(inputUrl: string, error: unknown): UrlImportPreviewItem {
  const raw = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const code = (raw in FAILURE_MESSAGES ? raw : raw.includes("IMPORT_STOPPED") ? "IMPORT_STOPPED" : raw.includes("timeout") || raw.includes("aborted") ? "FETCH_TIMEOUT" : "INTERNAL_ERROR") as ImportFailureCode;
  const details = FAILURE_MESSAGES[code];
  const extractionStages = error && typeof error === "object" && "extractionStages" in error ? (error as { extractionStages?: UrlImportPreviewItem["extractionStages"] }).extractionStages : undefined;
  return { id: crypto.randomUUID(), inputUrl, status: "failed", decision: "FAILED", failureCode: code, failureReason: details.message, retryable: details.retryable, extractionStages };
}

export async function analyzeUrlBatch(input: {
  urls: string[];
  autoPublish?: boolean;
  minimumDiscount?: number;
  minimumScore?: number;
}, signal?: AbortSignal): Promise<UrlImportBatch> {
  const urls = [...new Set(input.urls.map((url) => url.trim()).filter(Boolean))].slice(0, 50);
  const existing = await getDeals(true);
  const existingByUrl = new Map(existing.map((deal) => [canonical(deal.sourceUrl || deal.url), deal]));
  const existingByProvider = new Map(existing.filter((deal) => deal.providerItemId).map((deal) => [`${deal.providerPlatform?.toLowerCase()}|${deal.providerItemId}`, deal]));
  const seenBatch = new Set<string>();
  const items: UrlImportPreviewItem[] = [];

  for (const inputUrl of urls) {
    try {
      if (signal?.aborted) throw signal.reason ?? new Error("FETCH_TIMEOUT");
      const product = await extractProductFromUrl(inputUrl, signal);
      const category = resolveDynamicCategory(product.category);
      product.category = category.category;
      const identity = `${product.platform.toLowerCase()}|${product.externalProductId || product.fingerprint}`;
      if (seenBatch.has(identity) || seenBatch.has(product.canonicalUrl)) {
        items.push({ id: crypto.randomUUID(), inputUrl, status: "duplicate", decision: "DUPLICATE_IN_CURRENT_BATCH", product, categoryAction: category.action, extractionStages: product.extractionStages });
        continue;
      }
      seenBatch.add(identity); seenBatch.add(product.canonicalUrl);
      const match = (product.externalProductId ? existingByProvider.get(`${product.platform.toLowerCase()}|${product.externalProductId}`) : undefined)
        ?? existingByUrl.get(canonical(product.canonicalUrl))
        ?? existing.find((deal) => deal.platform.toLowerCase() === product.platform.toLowerCase() && normalize(deal.title) === normalize(product.title));
      if (match) {
        const changed = Math.abs(match.price - product.price) >= 0.01 || Math.abs(match.mrp - product.mrp) >= 0.01;
        items.push({ id: crypto.randomUUID(), inputUrl, status: changed ? "update" : "duplicate", decision: changed ? "UPDATE_PRICE" : "DUPLICATE_UNCHANGED", product, existingDealId: match.id, categoryAction: category.action, extractionStages: product.extractionStages });
        continue;
      }
      items.push({ id: crypto.randomUUID(), inputUrl, status: "ready", decision: "NEW", product, categoryAction: category.action, extractionStages: product.extractionStages });
    } catch (error) { items.push(failureItem(inputUrl, error)); }
  }

  const batch: UrlImportBatch = {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "preview",
    options: { autoPublish: Boolean(input.autoPublish), minimumDiscount: Number(input.minimumDiscount ?? 0), minimumScore: Number(input.minimumScore ?? 0) },
    items,
    summary: {
      submitted: urls.length,
      ready: items.filter((item) => item.decision === "NEW").length,
      updates: items.filter((item) => item.decision === "UPDATE_PRICE" || item.decision === "REACTIVATE").length,
      duplicates: items.filter((item) => item.decision.startsWith("DUPLICATE")).length,
      failed: items.filter((item) => item.decision === "FAILED").length,
      imported: 0,
    },
  };
  return saveBatch(batch);
}

export async function commitUrlBatch(batchId: string, selectedItemIds?: string[]) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error("Import preview was not found.");
  const selected = selectedItemIds?.length ? new Set(selectedItemIds) : null;
  let imported = 0;
  for (const item of batch.items) {
    if (selected && !selected.has(item.id)) continue;
    if (!item.product || !["NEW", "UPDATE_PRICE", "REACTIVATE"].includes(item.decision)) continue;
    const product = item.product;
    if (product.discountPercent < batch.options.minimumDiscount || product.score < batch.options.minimumScore) continue;
    await saveDeal({
      id: item.existingDealId,
      title: product.title,
      platform: product.platform,
      category: product.category,
      price: product.price,
      mrp: product.mrp,
      rating: product.rating ?? 4.5,
      votes: product.reviewCount ?? 0,
      imageUrl: product.imageUrl,
      url: product.canonicalUrl,
      sourceUrl: product.sourceUrl,
      providerItemId: product.externalProductId || product.fingerprint,
      providerPlatform: product.platform,
      source: "affiliate",
      tag: product.discountPercent > 0 ? `${product.discountPercent}% OFF` : "Smart deal",
      active: batch.options.autoPublish,
      status: batch.options.autoPublish ? "published" : "review",
    });
    imported += 1;
  }
  batch.status = imported > 0 ? "committed" : "partial";
  batch.committedAt = new Date().toISOString();
  batch.summary.imported = imported;
  saveBatch(batch);
  return batch;
}
