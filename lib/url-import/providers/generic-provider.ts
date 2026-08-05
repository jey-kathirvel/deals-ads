import * as cheerio from "cheerio";
import { collectHtmlImageCandidates } from "../image-engine";
import type { ProviderContext, ProviderExtraction, UrlImportProvider } from "./types";
import { detectPlatform } from "../platforms";

function content($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const node = $(selector).first();
    const value = node.attr("content") || node.attr("href") || node.text();
    if (value?.trim()) return value.trim();
  }
  return "";
}

function money(value: unknown) {
  const match = String(value ?? "").replace(/,/g, "").match(/(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  return match ? Number(match[1]) : Number.NaN;
}

export const genericProvider: UrlImportProvider = {
  platform: "Generic",
  supports: () => true,
  isProductUrl: (url) => url.pathname !== "/" && url.pathname.split("/").filter(Boolean).length >= 2,
  async extract(context: ProviderContext): Promise<ProviderExtraction> {
    const $ = cheerio.load(context.html);
    let product: Record<string, unknown> = {};
    $('script[type="application/ld+json"]').each((_index, node) => {
      if (Object.keys(product).length) return;
      try {
        const parsed = JSON.parse($(node).text());
        const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
        while (queue.length) {
          const current = queue.shift();
          if (!current || typeof current !== "object") continue;
          if (Array.isArray(current)) { queue.push(...current); continue; }
          if (Array.isArray(current["@graph"])) queue.push(...current["@graph"]);
          if (String(current["@type"] ?? "").toLowerCase().includes("product")) { product = current; break; }
        }
      } catch { /* ignore malformed metadata */ }
    });
    const offersRaw = product.offers;
    const offers = (Array.isArray(offersRaw) ? offersRaw[0] : offersRaw) as Record<string, unknown> | undefined;
    const imageRaw = Array.isArray(product.image) ? product.image[0] : product.image;
    const brandRaw = product.brand as Record<string, unknown> | string | undefined;
    const title = String(product.name ?? content($, ['meta[property="og:title"]','meta[name="twitter:title"]','h1','title'])).trim();
    return {
      title,
      imageUrl: String(imageRaw ?? content($, ['meta[property="og:image"]','meta[name="twitter:image"]','link[rel="image_src"]'])),
      imageCandidates: collectHtmlImageCandidates(context.html, context.finalUrl),
      price: money(offers?.price ?? content($, ['meta[property="product:price:amount"]','[itemprop="price"]','.a-price .a-offscreen','[class*="selling-price"]','[class*="salePrice"]'])),
      mrp: money(offers?.highPrice ?? content($, ['meta[property="product:original_price:amount"]','[class*="mrp"]','[class*="original-price"]','.a-text-price .a-offscreen'])),
      brand: typeof brandRaw === "string" ? brandRaw : String(brandRaw?.name ?? ""),
      category: String(product.category ?? (content($, ['meta[property="product:category"]','[itemprop="category"]','nav[aria-label*="breadcrumb" i] a:last-child']) || "Uncategorized")),
      description: String(product.description ?? content($, ['meta[name="description"]'])),
      externalProductId: String(product.sku ?? product.productID ?? "") || undefined,
      availability: String(offers?.availability ?? "").toLowerCase().includes("outofstock") ? "unavailable" : "available",
      rating: Number((product.aggregateRating as Record<string, unknown> | undefined)?.ratingValue ?? 0) || undefined,
      reviewCount: Number((product.aggregateRating as Record<string, unknown> | undefined)?.reviewCount ?? 0) || undefined,
    };
  },
};

export function platformForGeneric(url: URL) { return detectPlatform(url); }
