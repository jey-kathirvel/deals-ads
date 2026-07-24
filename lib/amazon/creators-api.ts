type JsonRecord = Record<string, unknown>;

export type AmazonSearchOptions = {
  keywords: string;
  searchIndex?: string;
  itemCount?: number;
};

export type AmazonProduct = {
  asin: string;
  title: string;
  detailPageUrl: string;
  imageUrl: string;
  price: number;
  mrp: number;
  rating: number;
  votes: number;
  category: string;
  expiresAt: string;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

const API_BASE =
  process.env.AMAZON_CREATORS_API_BASE ||
  "https://creatorsapi.amazon/catalog/v1";

const MARKETPLACE =
  process.env.AMAZON_MARKETPLACE ||
  "www.amazon.in";

const PARTNER_TAG =
  process.env.AMAZON_PARTNER_TAG ||
  "";

const CREDENTIAL_ID =
  process.env.AMAZON_CREATORS_CREDENTIAL_ID ||
  "";

const CREDENTIAL_SECRET =
  process.env.AMAZON_CREATORS_CREDENTIAL_SECRET ||
  "";

const CREDENTIAL_VERSION =
  process.env.AMAZON_CREATORS_CREDENTIAL_VERSION ||
  "2.2";

const TOKEN_URL =
  process.env.AMAZON_CREATORS_TOKEN_URL ||
  "";

function requireConfiguration() {
  const missing: string[] = [];

  if (!PARTNER_TAG) {
    missing.push("AMAZON_PARTNER_TAG");
  }

  if (!CREDENTIAL_ID) {
    missing.push("AMAZON_CREATORS_CREDENTIAL_ID");
  }

  if (!CREDENTIAL_SECRET) {
    missing.push("AMAZON_CREATORS_CREDENTIAL_SECRET");
  }

  if (!TOKEN_URL) {
    missing.push("AMAZON_CREATORS_TOKEN_URL");
  }

  if (missing.length > 0) {
    throw new Error(
      `Amazon Creators API configuration missing: ${missing.join(", ")}`,
    );
  }
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object"
    ? (value as JsonRecord)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function firstObject(value: unknown): JsonRecord {
  const first = arrayValue(value)[0];
  return objectValue(first);
}

async function getAccessToken(): Promise<string> {
  requireConfiguration();

  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${CREDENTIAL_ID}:${CREDENTIAL_SECRET}`,
    "utf8",
  ).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "creatorsapi/default",
    }),
    cache: "no-store",
  });

  const body = objectValue(await response.json().catch(() => ({})));

  if (!response.ok) {
    throw new Error(
      `Amazon token request failed with HTTP ${response.status}: ${
        stringValue(body.error_description) ||
        stringValue(body.message) ||
        "Unknown authentication error"
      }`,
    );
  }

  const accessToken = stringValue(body.access_token);
  const expiresIn = numberValue(body.expires_in) || 3600;

  if (!accessToken) {
    throw new Error("Amazon token response did not contain access_token.");
  }

  cachedToken = {
    value: accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return accessToken;
}

function authorizationHeader(token: string): string {
  if (CREDENTIAL_VERSION.startsWith("3.")) {
    return `Bearer ${token}`;
  }

  return `Bearer ${token}, Version ${CREDENTIAL_VERSION}`;
}

async function creatorsApiRequest(
  operation: string,
  payload: JsonRecord,
): Promise<JsonRecord> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/${operation}`, {
    method: "POST",
    headers: {
      authorization: authorizationHeader(token),
      "content-type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = objectValue(await response.json().catch(() => ({})));

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const reason =
      stringValue(body.reason) ||
      stringValue(body.type) ||
      "AmazonCreatorsApiError";

    throw new Error(
      [
        `Amazon Creators API ${operation} failed`,
        `HTTP ${response.status}`,
        reason,
        stringValue(body.message),
        retryAfter ? `retry-after=${retryAfter}` : "",
      ]
        .filter(Boolean)
        .join(": "),
    );
  }

  return body;
}

function extractPrice(listing: JsonRecord): number {
  const price = objectValue(listing.price);
  const amount = numberValue(price.amount || price.value);

  if (amount > 0) {
    return amount;
  }

  const displayAmount = stringValue(
    price.displayAmount ||
    price.displayValue,
  );

  return numberValue(displayAmount);
}

function extractMrp(listing: JsonRecord, price: number): number {
  const savingBasis = objectValue(listing.savingBasis);
  const amount = numberValue(
    savingBasis.amount ||
    savingBasis.value,
  );

  if (amount > 0) {
    return amount;
  }

  const displayAmount = stringValue(
    savingBasis.displayAmount ||
    savingBasis.displayValue,
  );

  const parsed = numberValue(displayAmount);

  return parsed > 0 ? parsed : price;
}

function extractAmazonProduct(itemValue: unknown): AmazonProduct | null {
  const item = objectValue(itemValue);
  const itemInfo = objectValue(item.itemInfo);
  const titleObject = objectValue(itemInfo.title);

  const title =
    stringValue(titleObject.displayValue) ||
    stringValue(titleObject.value) ||
    stringValue(item.title);

  const asin =
    stringValue(item.asin) ||
    stringValue(item.ASIN);

  const detailPageUrl =
    stringValue(item.detailPageUrl) ||
    stringValue(item.detailPageURL) ||
    stringValue(item.url);

  if (!asin || !title || !detailPageUrl) {
    return null;
  }

  const images = objectValue(item.images);
  const primary = objectValue(images.primary);
  const large = objectValue(primary.large);
  const medium = objectValue(primary.medium);

  const imageUrl =
    stringValue(large.url) ||
    stringValue(medium.url);

  const offersV2 = objectValue(
    item.offersV2 ||
    item.offersv2,
  );

  const listings = arrayValue(
    offersV2.listings ||
    objectValue(item.offers).listings,
  );

  const listing = objectValue(listings[0]);
  const price = extractPrice(listing);
  const mrp = extractMrp(listing, price);

  if (price <= 0 || mrp <= 0) {
    return null;
  }

  const customerReviews = objectValue(
    item.customerReviews ||
    itemInfo.customerReviews,
  );

  const rating = numberValue(
    customerReviews.starRating ||
    customerReviews.rating,
  );

  const votes = numberValue(
    customerReviews.count ||
    customerReviews.reviewCount,
  );

  const classifications = objectValue(
    itemInfo.classifications,
  );

  const category =
    stringValue(
      objectValue(classifications.productGroup).displayValue,
    ) ||
    "Amazon Deals";

  const dealDetails = objectValue(listing.dealDetails);

  return {
    asin,
    title,
    detailPageUrl,
    imageUrl,
    price,
    mrp,
    rating,
    votes,
    category,
    expiresAt:
      stringValue(dealDetails.endTime) ||
      "",
  };
}

function locateItems(body: JsonRecord): unknown[] {
  const searchResult = objectValue(
    body.searchResult ||
    body.searchItemsResult ||
    body.itemsResult,
  );

  const candidates = [
    searchResult.items,
    body.items,
    objectValue(body.data).items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export async function searchAmazonItems(
  options: AmazonSearchOptions,
): Promise<AmazonProduct[]> {
  const keywords = options.keywords.trim();

  if (!keywords) {
    throw new Error("Amazon search keywords cannot be empty.");
  }

  const itemCount = Math.min(
    10,
    Math.max(1, Number(options.itemCount || 10)),
  );

  const response = await creatorsApiRequest("searchItems", {
    keywords,
    searchIndex: options.searchIndex || "All",
    itemCount,
    partnerTag: PARTNER_TAG,
    marketplace: MARKETPLACE,
    resources: [
      "images.primary.large",
      "itemInfo.title",
      "itemInfo.classifications",
      "offersV2.listings.price",
      "offersV2.listings.savingBasis",
      "offersV2.listings.savings",
      "offersV2.listings.dealDetails",
    ],
  });

  return locateItems(response)
    .map(extractAmazonProduct)
    .filter((item): item is AmazonProduct => item !== null);
}
