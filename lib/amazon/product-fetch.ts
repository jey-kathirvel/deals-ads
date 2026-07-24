import {
  calculateDiscountPercent,
  extractAmazonAsin,
  parseAmazonAffiliateLink,
} from "@/lib/amazon/affiliate-link";

const AMAZON_PRODUCT_HOSTS = new Set([
  "amazon.in",
  "www.amazon.in",
  "amazon.com",
  "www.amazon.com",
]);

const AMAZON_SHORT_HOSTS = new Set([
  "amzn.to",
  "www.amzn.to",
  "link.amazon",
  "www.link.amazon",
  "amazon.app.link",
  "www.amazon.app.link",
  "amazon.page.link",
  "www.amazon.page.link",
]);

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 8;
const MAX_HTML_SIZE = 4_000_000;

export type AmazonProductDetails = {
  asin: string;
  sourceUrl: string;
  resolvedUrl: string;
  affiliateUrl: string;
  title: string;
  imageUrl: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  availability: string;
  category: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );
}

function normalizeInputUrl(value: string): URL {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Amazon URL is required.");
  }

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(normalized);

  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS Amazon URLs are supported.");
  }

  return parsed;
}

function isAmazonProductHost(
  hostname: string,
): boolean {
  const host = hostname.toLowerCase();

  return (
    AMAZON_PRODUCT_HOSTS.has(host) ||
    host === "amazon.in" ||
    host.endsWith(".amazon.in") ||
    host === "amazon.com" ||
    host.endsWith(".amazon.com")
  );
}

function isAllowedAmazonRedirectHost(
  hostname: string,
): boolean {
  const host = hostname.toLowerCase();

  return (
    isAmazonProductHost(host) ||
    AMAZON_SHORT_HOSTS.has(host) ||
    host === "amazon.app.link" ||
    host.endsWith(".amazon.app.link") ||
    host === "amazon.page.link" ||
    host.endsWith(".amazon.page.link")
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveAmazonUrl(
  value: string,
): Promise<string> {
  let current = normalizeInputUrl(value);

  if (!isAllowedAmazonRedirectHost(current.hostname)) {
    throw new Error(
      "Only Amazon product and SiteStripe links are supported.",
    );
  }

  for (let attempt = 0; attempt < MAX_REDIRECTS; attempt += 1) {
    const response = await fetchWithTimeout(current.toString(), {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/131.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }).catch(() => null);

    if (!response) {
      break;
    }

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location = response.headers.get("location");

      if (!location) {
        break;
      }

      current = new URL(location, current);

      if (!isAllowedAmazonRedirectHost(current.hostname)) {
        throw new Error(
          `Amazon short URL redirected to unsupported domain: ${current.hostname}`,
        );
      }

      continue;
    }

    if (response.url) {
      current = new URL(response.url);
    }

    break;
  }

  if (!isAmazonProductHost(current.hostname)) {
    const response = await fetchWithTimeout(current.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/131.0.0.0 Mobile Safari/537.36",
        "accept-language":
          "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (response.url) {
      current = new URL(response.url);
    }

    if (!isAmazonProductHost(current.hostname)) {
      const html = await response.text();

      const canonicalMatch =
        html.match(
          /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
        ) ||
        html.match(
          /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
        ) ||
        html.match(
          /https:\/\/(?:www\.)?amazon\.in\/(?:dp|gp\/product)\/[A-Z0-9]{10}[^"'\\s<]*/i,
        );

      const candidate =
        canonicalMatch?.[1] ||
        canonicalMatch?.[0] ||
        "";

      if (candidate) {
        current = new URL(candidate, current);
      }
    }
  }

  if (!isAmazonProductHost(current.hostname)) {
    throw new Error(
      `SiteStripe URL could not be resolved to an Amazon product page. Final host: ${current.hostname}`,
    );
  }

  return current.toString();
}

function firstMatch(
  html: string,
  patterns: RegExp[],
): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return stripTags(match[1]);
    }
  }

  return "";
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const cleaned = value
    .replace(/[₹,\s]/g, "")
    .replace(/[^\d.]/g, "");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInteger(value: string): number {
  const parsed = Number(
    value.replace(/[^\d]/g, ""),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(
        decodeHtml(match[1]).trim(),
      ) as unknown;

      const entries = Array.isArray(parsed)
        ? parsed
        : [parsed];

      for (const entry of entries) {
        if (
          entry &&
          typeof entry === "object"
        ) {
          results.push(
            entry as Record<string, unknown>,
          );
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return results;
}

function findProductJsonLd(
  entries: Record<string, unknown>[],
): Record<string, unknown> | null {
  for (const entry of entries) {
    const type = entry["@type"];

    if (
      type === "Product" ||
      (Array.isArray(type) &&
        type.includes("Product"))
    ) {
      return entry;
    }

    const graph = entry["@graph"];

    if (Array.isArray(graph)) {
      const nested = findProductJsonLd(
        graph.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        ),
      );

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function getOffer(
  product: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!product) {
    return null;
  }

  const offers = product.offers;

  if (Array.isArray(offers)) {
    const first = offers[0];

    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }

  return offers && typeof offers === "object"
    ? (offers as Record<string, unknown>)
    : null;
}

function metaContent(
  html: string,
  key: string,
): string {
  const escaped = key.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  return firstMatch(html, [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ]);
}

export async function fetchAmazonProductDetails(
  inputUrl: string,
): Promise<AmazonProductDetails> {
  const resolvedUrl = await resolveAmazonUrl(inputUrl);

  const asin = extractAmazonAsin(resolvedUrl);
  const affiliate = parseAmazonAffiliateLink(resolvedUrl);

  const response = await fetchWithTimeout(resolvedUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36",
      "accept-language":
        "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Amazon returned HTTP ${response.status}.`,
    );
  }

  const contentLength = Number(
    response.headers.get("content-length") || "0",
  );

  if (contentLength > MAX_HTML_SIZE) {
    throw new Error("Amazon product page is too large.");
  }

  const html = await response.text();

  if (html.length > MAX_HTML_SIZE) {
    throw new Error("Amazon product page is too large.");
  }

  if (
    /api-services-support@amazon\.com|enter the characters you see below|sorry! something went wrong/i.test(
      html,
    )
  ) {
    return {
      asin,
      sourceUrl: inputUrl,
      resolvedUrl,
      affiliateUrl: affiliate.affiliateUrl,
      title: "",
      imageUrl: "",
      price: 0,
      mrp: 0,
      discountPercent: 0,
      rating: 0,
      reviewCount: 0,
      availability: "",
      category: "Amazon Deals",
    };
  }

  const jsonLd = findProductJsonLd(parseJsonLd(html));
  const offer = getOffer(jsonLd);

  const aggregateRating =
    jsonLd?.aggregateRating &&
    typeof jsonLd.aggregateRating === "object"
      ? (jsonLd.aggregateRating as Record<string, unknown>)
      : null;

  const title =
    (typeof jsonLd?.name === "string"
      ? jsonLd.name
      : "") ||
    metaContent(html, "og:title") ||
    firstMatch(html, [
      /<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]);

  const jsonImage = jsonLd?.image;
  const imageUrl =
    (typeof jsonImage === "string"
      ? jsonImage
      : Array.isArray(jsonImage) &&
          typeof jsonImage[0] === "string"
        ? jsonImage[0]
        : "") ||
    metaContent(html, "og:image") ||
    firstMatch(html, [
      /id=["']landingImage["'][^>]+src=["']([^"']+)["']/i,
      /id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i,
    ]);

  const jsonPrice =
    offer?.price ??
    offer?.lowPrice ??
    offer?.highPrice;

  let price = parseMoney(jsonPrice);

  if (!price) {
    price = parseMoney(
      firstMatch(html, [
        /<span[^>]+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
        /<span[^>]+id=["']priceblock_dealprice["'][^>]*>([\s\S]*?)<\/span>/i,
        /<span[^>]+id=["']priceblock_ourprice["'][^>]*>([\s\S]*?)<\/span>/i,
        /"priceAmount"\s*:\s*"?([\d,.]+)"?/i,
      ]),
    );
  }

  let mrp = parseMoney(
    firstMatch(html, [
      /<span[^>]+class=["'][^"']*a-price[^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?<span[^>]+class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
      /<span[^>]+class=["'][^"']*basisPrice[^"']*["'][^>]*>[\s\S]*?<span[^>]+class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
      /"basisPrice"[\s\S]{0,300}?"priceAmount"\s*:\s*"?([\d,.]+)"?/i,
    ]),
  );

  if (!mrp) {
    mrp = price;
  }

  const rating =
    parseMoney(aggregateRating?.ratingValue) ||
    parseMoney(
      firstMatch(html, [
        /<span[^>]+class=["'][^"']*a-icon-alt[^"']*["'][^>]*>([\d.]+)\s+out of 5 stars<\/span>/i,
        /([\d.]+)\s+out of 5 stars/i,
        /"ratingValue"\s*:\s*"?([\d.]+)"?/i,
      ]),
    );

  const reviewCount =
    parseMoney(aggregateRating?.reviewCount) ||
    parseMoney(aggregateRating?.ratingCount) ||
    parseInteger(
      firstMatch(html, [
        /<span[^>]+id=["']acrCustomerReviewText["'][^>]*>([\s\S]*?)<\/span>/i,
        /"reviewCount"\s*:\s*"?([\d,]+)"?/i,
        /"ratingCount"\s*:\s*"?([\d,]+)"?/i,
      ]),
    );

  const availability =
    (typeof offer?.availability === "string"
      ? offer.availability.split("/").pop() || ""
      : "") ||
    firstMatch(html, [
      /<div[^>]+id=["']availability["'][^>]*>([\s\S]*?)<\/div>/i,
    ]);

  const category = firstMatch(html, [
    /<a[^>]+class=["'][^"']*a-link-normal[^"']*a-color-tertiary[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
  ]);

  if (!title) {
    throw new Error(
      "Product title could not be detected. Enter the details manually.",
    );
  }

  return {
    asin,
    sourceUrl: inputUrl,
    resolvedUrl,
    affiliateUrl: affiliate.affiliateUrl,
    title: title
      .replace(/\s*:\s*Amazon\.in.*$/i, "")
      .trim(),
    imageUrl,
    price,
    mrp,
    discountPercent:
      calculateDiscountPercent(price, mrp),
    rating,
    reviewCount: Math.round(reviewCount),
    availability,
    category: category || "Amazon Deals",
  };
}
