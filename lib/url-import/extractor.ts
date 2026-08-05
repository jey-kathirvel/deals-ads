import crypto from "node:crypto";
import { assertSafePublicUrl } from "./url-security";
import { canonicalProductUrl, detectPlatform } from "./platforms";
import { collectHtmlImageCandidates, selectRequiredImage } from "./image-engine";
import { resolveProvider } from "./providers/registry";
import type { ExtractionStage } from "./providers/types";
import type { ExtractedUrlProduct } from "./types";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function absoluteUrl(value: string, base: URL) {
  try { return new URL(value, base).toString(); } catch { return ""; }
}

function stage(stages: ExtractionStage[], name: ExtractionStage["stage"], status: ExtractionStage["status"], message: string, startedAt?: number) {
  stages.push({ stage: name, status, message, durationMs: startedAt ? Date.now() - startedAt : undefined });
}

async function fetchPage(rawUrl: string, signal: AbortSignal | undefined, stages: ExtractionStage[], redirectCount = 0): Promise<{ response: Response; finalUrl: URL; html: string }> {
  const validationStart = Date.now();
  const safeUrl = await assertSafePublicUrl(rawUrl);
  if (redirectCount === 0) stage(stages, "url_validation", "success", "URL is public and safe to fetch.", validationStart);
  const fetchStart = Date.now();
  const response = await fetch(safeUrl, {
    redirect: "manual",
    signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15_000)]),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });
  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= 5) throw new Error("ACCESS_BLOCKED");
    const location = response.headers.get("location");
    if (!location) throw new Error("ACCESS_BLOCKED");
    const redirected = new URL(location, safeUrl);
    await assertSafePublicUrl(redirected.toString());
    return fetchPage(redirected.toString(), signal, stages, redirectCount + 1);
  }
  if (response.status === 404) throw new Error("PAGE_NOT_FOUND");
  if (response.status === 401 || response.status === 403) throw new Error("ACCESS_BLOCKED");
  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (!response.ok) throw new Error("PARSER_FAILED");
  const html = await response.text();
  stage(stages, "page_fetch", "success", `Page fetched successfully (${html.length.toLocaleString()} bytes).`, fetchStart);
  return { response, finalUrl: safeUrl, html };
}

export async function extractProductFromUrl(rawUrl: string, signal?: AbortSignal): Promise<ExtractedUrlProduct> {
  const stages: ExtractionStage[] = [];
  const { finalUrl, html } = await fetchPage(rawUrl, signal, stages);
  const provider = resolveProvider(finalUrl);
  const detected = provider.platform === "Generic" ? detectPlatform(finalUrl) : provider.platform;
  stage(stages, "platform_detection", "success", `Detected provider: ${detected}.`);
  if (!provider.isProductUrl(finalUrl)) {
    stage(stages, "product_detection", "failed", "The supplied URL is not recognized as a product page.");
    throw Object.assign(new Error("INVALID_PRODUCT_URL"), { extractionStages: stages });
  }
  stage(stages, "product_detection", "success", "The URL matches a product page pattern.");
  let extracted;
  try {
    extracted = await provider.extract({ requestedUrl: new URL(rawUrl), finalUrl, html, signal });
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error("PARSER_FAILED"), { extractionStages: stages });
  }
  const title = String(extracted.title ?? "").replace(/\s*[|–-]\s*(Zepto|Blinkit|Amazon|Flipkart).*$/i, "").trim();
  if (!title) {
    stage(stages, "product_name", "failed", "Product name was not present in provider metadata.");
    throw Object.assign(new Error("PRODUCT_NAME_NOT_FOUND"), { extractionStages: stages });
  }
  stage(stages, "product_name", "success", `Product name extracted: ${title}.`);
  const imageStart = Date.now();
  let imageUrl: string;
  try {
    const providerCandidates = extracted.imageCandidates ?? [];
    const primaryCandidate = absoluteUrl(String(extracted.imageUrl ?? ""), finalUrl);
    const candidates = [
      ...(primaryCandidate ? [{ url: primaryCandidate, source: "provider-primary", priority: 160 }] : []),
      ...providerCandidates,
      ...collectHtmlImageCandidates(html, finalUrl),
    ];
    const selected = await selectRequiredImage(candidates, signal);
    imageUrl = selected.imageUrl;
    const rejected = selected.attempts.filter((attempt) => attempt.status === "rejected");
    const selectedAttempt = selected.attempts.find((attempt) => attempt.status === "selected");
    const summary = rejected.length
      ? `${selected.candidateCount} candidates checked; selected ${selectedAttempt?.source ?? "best candidate"} after ${rejected.length} rejection(s).`
      : `${selected.candidateCount} candidate(s) checked; selected ${selectedAttempt?.source ?? "best candidate"}.`;
    stage(stages, "product_image", "success", `Mandatory product image validated. ${summary}`, imageStart);
  } catch (error) {
    const candidateCount = Number((error as { imageCandidateCount?: number })?.imageCandidateCount ?? 0);
    const attempts = ((error as { imageAttempts?: Array<{ reason: string }> })?.imageAttempts ?? []).slice(0, 3);
    const detail = attempts.length ? ` ${attempts.map((attempt) => attempt.reason).join("; ")}.` : "";
    stage(stages, "product_image", "failed", `${candidateCount} image candidate(s) found, but none passed validation.${detail}`, imageStart);
    throw Object.assign(error instanceof Error ? error : new Error("PRODUCT_IMAGE_INVALID"), { extractionStages: stages });
  }
  const price = Number(extracted.price);
  if (!Number.isFinite(price) || price <= 0) {
    stage(stages, "price", "failed", "Selling price was not found in provider metadata.");
    throw Object.assign(new Error("PRICE_NOT_FOUND"), { extractionStages: stages });
  }
  let mrp = Number(extracted.mrp);
  if (!Number.isFinite(mrp) || mrp < price) mrp = price;
  stage(stages, "price", "success", `Price extracted: ₹${price}; MRP ₹${mrp}.`);
  const category = String(extracted.category || "Uncategorized").trim() || "Uncategorized";
  stage(stages, "category", "success", category === "Uncategorized" ? "Category will use the dynamic fallback." : `Category extracted: ${category}.`);
  const platform = detected;
  const externalProductId = String(extracted.externalProductId ?? "").trim() || undefined;
  const brand = String(extracted.brand ?? "").trim();
  const packSize = title.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml|pcs?|pieces?|pack)\b/i)?.[0] ?? "";
  const canonicalUrl = canonicalProductUrl(finalUrl);
  const fingerprint = crypto.createHash("sha256").update([platform, externalProductId || "", normalize(brand), normalize(title), normalize(packSize)].join("|")).digest("hex");
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const score = Math.min(100, Math.round(Math.min(discountPercent, 40) * 0.75 + 30 + (brand ? 10 : 0) + (category !== "Uncategorized" ? 10 : 0) + 10));
  return {
    platform, sourceUrl: rawUrl, canonicalUrl, externalProductId, title, brand, category, packSize,
    description: String(extracted.description ?? ""), price, mrp, discountPercent, imageUrl,
    rating: extracted.rating, reviewCount: extracted.reviewCount,
    availability: extracted.availability ?? "unknown", fingerprint, score, extractionStages: stages,
  };
}
