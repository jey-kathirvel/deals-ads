import * as cheerio from "cheerio";
import { collectHtmlImageCandidates, dedupeCandidates, type ImageCandidate } from "../image-engine";
import type { ProviderContext, ProviderExtraction, UrlImportProvider } from "./types";
import { collectJsonObjects, firstNumber, firstString, safeJsonParse } from "./json-utils";

function slugTitle(url: URL) {
  const match = url.pathname.match(/\/pn\/([^/]+)\/pvid\//i);
  return match?.[1]?.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") ?? "";
}

function absolute(value: string, base: URL) { try { return new URL(value, base).toString(); } catch { return ""; } }

function collectJsonImageCandidates(objects: Record<string, unknown>[], baseUrl: URL): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const imageKeys = /^(?:image|images|imageurl|image_url|primaryimage|primary_image|thumbnail|thumbnailurl|thumbnail_url|media|gallery|assets)$/i;
  const add = (value: unknown, source: string, priority: number) => {
    if (typeof value !== "string") return;
    const url = absolute(value, baseUrl);
    if (url && /(?:image|cdn|zepto|cloudinary|webp|png|jpe?g|avif)/i.test(url)) candidates.push({ url, source, priority });
  };
  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      if (!imageKeys.test(key)) continue;
      if (typeof value === "string") add(value, `zepto-json:${key}`, 145);
      else if (Array.isArray(value)) {
        value.forEach((entry, index) => {
          if (typeof entry === "string") add(entry, `zepto-json:${key}[${index}]`, 140 - index);
          else if (entry && typeof entry === "object") {
            for (const [nestedKey, nestedValue] of Object.entries(entry as Record<string, unknown>)) {
              if (/url|src|image/i.test(nestedKey)) add(nestedValue, `zepto-json:${key}.${nestedKey}`, 138 - index);
            }
          }
        });
      } else if (value && typeof value === "object") {
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          if (/url|src|image/i.test(nestedKey)) add(nestedValue, `zepto-json:${key}.${nestedKey}`, 136);
        }
      }
    }
  }
  return candidates;
}

export const zeptoProvider: UrlImportProvider = {
  platform: "Zepto",
  supports: (url) => /(^|\.)zepto\.com$/i.test(url.hostname),
  isProductUrl: (url) => /\/pn\/[^/]+\/pvid\/[a-z0-9-]+/i.test(url.pathname),
  async extract(context: ProviderContext): Promise<ProviderExtraction> {
    const $ = cheerio.load(context.html);
    const roots: unknown[] = [];
    $('script[type="application/ld+json"], script#__NEXT_DATA__, script[type="application/json"]').each((_index, node) => {
      const parsed = safeJsonParse($(node).text());
      if (parsed) roots.push(parsed);
    });
    const jsonPatterns = [
      /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
      /window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
    ];
    for (const pattern of jsonPatterns) {
      const match = context.html.match(pattern);
      if (match?.[1]) { const parsed = safeJsonParse(match[1]); if (parsed) roots.push(parsed); }
    }
    const objects = roots.flatMap((root) => collectJsonObjects(root));
    const productId = context.finalUrl.pathname.match(/\/pvid\/([a-z0-9-]+)/i)?.[1];
    const likely = objects.filter((object) => {
      const id = String(object.id ?? object.productId ?? object.product_id ?? object.pvid ?? object.sku ?? "");
      const hasName = [object.name, object.productName, object.title].some((value) => typeof value === "string" && value.trim());
      return (productId && id.includes(productId)) || hasName;
    });
    const source = likely.length ? likely : objects;
    const title = firstString(source, ["productName", "name", "title", "displayName"]) || slugTitle(context.finalUrl);
    const legacyImage = firstString(source, ["imageUrl", "image_url", "image", "primaryImage", "thumbnail", "thumbnailUrl"])
      || $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
    const imageCandidates = dedupeCandidates([
      ...collectJsonImageCandidates(source, context.finalUrl),
      ...collectJsonImageCandidates(objects, context.finalUrl),
      ...collectHtmlImageCandidates(context.html, context.finalUrl),
      ...(legacyImage ? [{ url: absolute(legacyImage, context.finalUrl), source: "zepto-primary", priority: 150 }] : []),
    ].filter((candidate) => candidate.url));
    const price = firstNumber(source, ["sellingPrice", "selling_price", "discountedPrice", "discounted_price", "offerPrice", "offer_price", "price"]);
    const mrp = firstNumber(source, ["mrp", "maximumRetailPrice", "maximum_retail_price", "originalPrice", "original_price", "listPrice", "list_price"]);
    const availabilityText = firstString(source, ["availability", "stockStatus", "stock_status", "inventoryStatus"]);
    return {
      title,
      imageUrl: imageCandidates[0]?.url,
      imageCandidates,
      price,
      mrp,
      brand: firstString(source, ["brandName", "brand_name", "brand"]),
      category: firstString(source, ["categoryName", "category_name", "category", "subCategoryName", "sub_category_name"]) || "Uncategorized",
      description: firstString(source, ["description", "productDescription", "product_description", "shortDescription"]),
      externalProductId: productId || firstString(source, ["productId", "product_id", "pvid", "sku", "id"]),
      availability: /out|unavailable|sold/i.test(availabilityText) ? "unavailable" : availabilityText ? "available" : "unknown",
      rating: firstNumber(source, ["rating", "averageRating", "average_rating"]),
      reviewCount: firstNumber(source, ["reviewCount", "review_count", "ratingsCount", "ratings_count"]),
    };
  },
};
