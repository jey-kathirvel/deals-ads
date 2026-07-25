type JsonRecord = Record<string, unknown>;

export interface QuickCommerceProduct {
  id: string;
  name: string;
  brand: string;
  available: boolean;
  images: string[];
  mrp: number;
  offerPrice: number;
  deeplink: string;
  rating: number;
  ratingCount: number;
  inventory: number | null;
  rank: number;
  platform: string;
}

export interface QuickCommerceSearchRequest {
  query: string;
  platform: string;
  latitude: number;
  longitude: number;
  pincode?: string;
  signal?: AbortSignal;
}

export interface QuickCommerceItemRequest {
  itemId: string;
  platform: string;
  latitude: number;
  longitude: number;
  pincode?: string;
  signal?: AbortSignal;
}

export class QuickCommerceHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "QuickCommerceHttpError";
  }
}

export interface QuickCommerceClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object"
    ? value as JsonRecord
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function productsFrom(body: JsonRecord): unknown[] {
  const data = record(body.data);
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function productFrom(value: unknown): QuickCommerceProduct | null {
  const item = record(value);
  const platformValue = item.platform;
  const platform = typeof platformValue === "string"
    ? platformValue
    : text(record(platformValue).name);
  const id = text(item.id) || text(item.item_id);
  const name = text(item.name);
  const deeplink = text(item.deeplink);
  const imagesValue = Array.isArray(item.images)
    ? item.images
    : Array.isArray(item.gallery)
      ? item.gallery.map((image) => record(image).url)
      : [];
  const images = imagesValue.map(text).filter(Boolean);

  if (!id || !name || !platform || !deeplink) {
    return null;
  }

  const inventoryValue = number(item.inventory);
  return {
    id,
    name,
    brand: text(item.brand),
    available: item.available === undefined ? true : boolean(item.available),
    images,
    mrp: number(item.mrp),
    offerPrice: number(item.offer_price) || number(item.price),
    deeplink,
    rating: number(item.rating),
    ratingCount: number(item.rating_count),
    inventory: item.inventory === null || item.inventory === undefined
      ? null
      : inventoryValue,
    rank: number(item.rank),
    platform,
  };
}

export class QuickCommerceClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: QuickCommerceClientOptions) {
    this.apiKey = options.apiKey.trim();
    if (!this.apiKey) {
      throw new Error("QuickCommerce API key is required.");
    }
    this.baseUrl = (options.baseUrl ?? "https://api.quickcommerceapi.com")
      .replace(/\/+$/, "");
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async search(request: QuickCommerceSearchRequest): Promise<QuickCommerceProduct[]> {
    const body = await this.get("/v1/search", {
      q: request.query,
      platform: request.platform,
      lat: String(request.latitude),
      lon: String(request.longitude),
      pincode: request.pincode,
    }, request.signal);
    return productsFrom(body)
      .map(productFrom)
      .filter((item): item is QuickCommerceProduct => item !== null);
  }

  async item(request: QuickCommerceItemRequest): Promise<QuickCommerceProduct | null> {
    const body = await this.get("/v1/item", {
      item_id: request.itemId,
      platform: request.platform,
      lat: String(request.latitude),
      lon: String(request.longitude),
      pincode: request.pincode,
    }, request.signal);
    return productsFrom(body)
      .map(productFrom)
      .find((item): item is QuickCommerceProduct => item !== null) ?? null;
  }

  private async get(
    path: string,
    parameters: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): Promise<JsonRecord> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(parameters)) {
      if (value) url.searchParams.set(key, value);
    }

    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    const response = await this.fetchImplementation(url, {
      headers: { "X-API-Key": this.apiKey },
      signal: combinedSignal,
    });
    const body = record(await response.json().catch(() => ({})));
    if (!response.ok) {
      throw new QuickCommerceHttpError(
        response.status,
        text(body.message) || text(body.error) || `HTTP ${response.status}`,
      );
    }
    return body;
  }
}
