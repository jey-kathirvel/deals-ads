const AMAZON_HOST_PATTERN =
  /(^|\.)amazon\.(in|com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)$/i;

const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
];

export type ParsedAmazonLink = {
  asin: string;
  sourceUrl: string;
  affiliateUrl: string;
};

function normalizeInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Amazon product URL is required.");
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function extractAmazonAsin(value: string): string {
  const input = normalizeInput(value);

  for (const pattern of ASIN_PATTERNS) {
    const match = input.match(pattern);

    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  throw new Error(
    "Unable to extract a valid 10-character Amazon ASIN from the URL.",
  );
}

export function parseAmazonAffiliateLink(
  value: string,
  partnerTag =
    process.env.AMAZON_PARTNER_TAG ||
    "adsaideals-21",
): ParsedAmazonLink {
  const input = normalizeInput(value);
  const parsed = new URL(input);

  const hostname = parsed.hostname
    .replace(/^www\./i, "")
    .toLowerCase();

  if (!AMAZON_HOST_PATTERN.test(hostname)) {
    throw new Error("Only Amazon product URLs are supported.");
  }

  const asin = extractAmazonAsin(parsed.toString());

  const affiliateUrl = new URL(
    `https://www.amazon.in/dp/${asin}`,
  );

  if (partnerTag.trim()) {
    affiliateUrl.searchParams.set(
      "tag",
      partnerTag.trim(),
    );
  }

  return {
    asin,
    sourceUrl: parsed.toString(),
    affiliateUrl: affiliateUrl.toString(),
  };
}

export function calculateDiscountPercent(
  price: number,
  mrp: number,
): number {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(mrp) ||
    price <= 0 ||
    mrp <= 0 ||
    price >= mrp
  ) {
    return 0;
  }

  return Math.round(((mrp - price) / mrp) * 100);
}

export function normalizeAmazonImageUrl(
  value: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const parsed = new URL(trimmed);

  if (parsed.protocol !== "https:") {
    throw new Error("Product image URL must use HTTPS.");
  }

  return parsed.toString();
}
