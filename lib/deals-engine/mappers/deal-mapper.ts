import type { Deal } from "@/lib/deal-types";

type LegacyMetadata = Partial<
  Pick<
    Deal,
    | "tag"
    | "color"
    | "emoji"
    | "code"
    | "expires"
    | "active"
    | "source"
    | "status"
    | "expiryDate"
    | "couponTerms"
    | "sourceUrl"
    | "lastCheckedAt"
    | "importedAt"
  >
>;

function parseMetadata(value: unknown): LegacyMetadata {
  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed as LegacyMetadata;
    }
  } catch {
    // Invalid legacy metadata must not break storefront reads.
  }

  return {};
}

function isoDate(value: unknown): string {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value as string | number);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString();
}

function legacyStatus(
  databaseStatus: string,
  metadata: LegacyMetadata,
): Deal["status"] {
  if (
    metadata.status === "draft" ||
    metadata.status === "review" ||
    metadata.status === "published" ||
    metadata.status === "expired"
  ) {
    return metadata.status;
  }

  if (databaseStatus === "EXPIRED") {
    return "expired";
  }

  if (databaseStatus === "ACTIVE") {
    return "published";
  }

  return "review";
}

function legacySource(metadata: LegacyMetadata): Deal["source"] {
  const source = metadata.source;

  if (
    source === "manual" ||
    source === "csv" ||
    source === "xlsx" ||
    source === "amazon" ||
    source === "flipkart" ||
    source === "affiliate"
  ) {
    return source;
  }

  return "manual";
}

export function dbToLegacyDeal(row: any): Deal {
  const metadata = parseMetadata(row.metadataJson);

  const expiryDate =
    metadata.expiryDate ||
    isoDate(row.expiresAt);

  const active =
    typeof metadata.active === "boolean"
      ? metadata.active
      : row.status === "ACTIVE" ||
        row.status === "EXPIRING";

  return {
    id: Number(row.id),

    title: String(row.title ?? ""),

    platform: String(row.platform ?? ""),

    category: String(
      row.categoryName ??
        metadata["category" as keyof LegacyMetadata] ??
        "General",
    ),

    price: Number(row.currentPrice ?? 0),

    mrp: Number(
      row.originalPrice ??
        row.currentPrice ??
        0,
    ),

    rating: Number(row.rating ?? 0),

    votes: Number(row.reviewCount ?? 0),

    tag: metadata.tag ?? "New deal",

    color: metadata.color ?? "#e7f1ec",

    emoji: metadata.emoji ?? "DEAL",

    imageUrl: String(row.imageUrl ?? ""),

    code: metadata.code ?? "",

    expires:
      metadata.expires ??
      (expiryDate ? expiryDate : "Limited time"),

    url: String(
      row.redirectUrl ??
        row.originalUrl ??
        "",
    ),

    active,

    source: legacySource(metadata),

    status: legacyStatus(
      String(row.status ?? ""),
      metadata,
    ),

    expiryDate,

    couponTerms: metadata.couponTerms ?? "",

    sourceUrl:
      metadata.sourceUrl ??
      String(row.originalUrl ?? ""),

    lastCheckedAt:
      metadata.lastCheckedAt ??
      isoDate(row.updatedAt),

    importedAt:
      metadata.importedAt ??
      isoDate(row.createdAt),

    updatedAt: isoDate(row.updatedAt),
  };
}
