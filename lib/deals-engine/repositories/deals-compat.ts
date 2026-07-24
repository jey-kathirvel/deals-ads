import { getDb } from "@/db";
import {
  dealCategories,
  deals,
} from "@/db/schema";
import type { Deal } from "@/lib/deal-types";
import {
  desc,
  eq,
} from "drizzle-orm";

import { dbToLegacyDeal } from "../mappers/deal-mapper";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "deal";
}

function canonicalUrl(value: string): string {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);

    const removableParameters = [
      "tag",
      "ascsubtag",
      "affid",
      "affExtParam1",
      "affExtParam2",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "ref_",
    ];

    for (const parameter of removableParameters) {
      url.searchParams.delete(parameter);
    }

    url.hash = "";

    return url.toString();
  } catch {
    return trimmed;
  }
}

function fingerprint(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);

    hash = Math.imul(hash, 16777619);
  }

  return `legacy-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function indiaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function validDate(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function databaseStatus(deal: Deal) {
  if (deal.status === "expired") {
    return "EXPIRED" as const;
  }

  if (!deal.active) {
    return "ARCHIVED" as const;
  }

  return "ACTIVE" as const;
}

function metadataJson(deal: Deal): string {
  return JSON.stringify({
    tag: deal.tag,
    color: deal.color,
    emoji: deal.emoji,
    code: deal.code,
    expires: deal.expires,
    active: deal.active,
    source: deal.source,
    status: deal.status,
    expiryDate: deal.expiryDate,
    couponTerms: deal.couponTerms,
    sourceUrl: deal.sourceUrl,
    lastCheckedAt: deal.lastCheckedAt,
    importedAt: deal.importedAt,
  });
}

async function resolveCategoryId(
  categoryName: string,
): Promise<number | null> {
  const db = getDb();

  const name = categoryName.trim() || "General";
  const slug = slugify(name);

  const existing = await db
    .select({
      id: dealCategories.id,
    })
    .from(dealCategories)
    .where(eq(dealCategories.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(dealCategories)
    .values({
      name,
      slug,
      isActive: true,
      updatedAt: new Date(),
    })
    .returning({
      id: dealCategories.id,
    });

  return inserted[0]?.id ?? null;
}

export async function getLegacyDeals(): Promise<Deal[]> {
  const db = getDb();

  const rows = await db
    .select({
      deal: deals,
      categoryName: dealCategories.name,
    })
    .from(deals)
    .leftJoin(
      dealCategories,
      eq(deals.categoryId, dealCategories.id),
    )
    .orderBy(desc(deals.createdAt));

  return rows.map((row) =>
    dbToLegacyDeal({
      ...row.deal,
      categoryName: row.categoryName,
    }),
  );
}

export async function persistLegacyDeal(
  deal: Deal,
): Promise<Deal> {
  const db = getDb();

  const now = new Date();
  const normalizedUrl = canonicalUrl(
    deal.sourceUrl || deal.url,
  );

  const categoryId = await resolveCategoryId(
    deal.category,
  );

  const expiry = validDate(deal.expiryDate);

  const values = {
    externalId: null,

    sourceFingerprint: fingerprint(
      `${deal.platform.toLowerCase()}|${normalizedUrl}`,
    ),

    platform: deal.platform.trim(),

    merchantName: deal.platform.trim(),

    categoryId,

    title: deal.title.trim(),

    slug:
      deal.id > 0
        ? `${slugify(deal.title)}-${deal.id}`
        : `${slugify(deal.title)}-${fingerprint(normalizedUrl).slice(-8)}`,

    description: deal.couponTerms || null,

    imageUrl: deal.imageUrl || null,

    originalUrl:
      deal.sourceUrl.trim() ||
      deal.url.trim(),

    normalizedUrl,

    redirectUrl: deal.url.trim(),

    currentPrice: Number(deal.price),

    originalPrice: Number(deal.mrp),

    discountPercent:
      deal.mrp > 0
        ? Math.max(
            0,
            Math.round(
              ((deal.mrp - deal.price) /
                deal.mrp) *
                10000,
            ) / 100,
          )
        : null,

    currency: "INR",

    rating: Number.isFinite(deal.rating)
      ? deal.rating
      : null,

    reviewCount: Number.isFinite(deal.votes)
      ? Math.max(0, Math.trunc(deal.votes))
      : 0,

    status: databaseStatus(deal),

    qualityScore: 0,

    discoveryDate: indiaDateString(
      validDate(deal.importedAt) ?? now,
    ),

    publishedAt:
      deal.status === "published"
        ? validDate(deal.importedAt) ?? now
        : null,

    expiresAt: expiry,

    expiredAt:
      deal.status === "expired"
        ? now
        : null,

    archivedAt:
      !deal.active &&
      deal.status !== "expired"
        ? now
        : null,

    metadataJson: metadataJson(deal),

    updatedAt: now,
  };

  if (deal.id > 0) {
    const updated = await db
      .update(deals)
      .set(values)
      .where(eq(deals.id, deal.id))
      .returning();

    if (!updated[0]) {
      throw new Error(
        `Deal ${deal.id} was not found.`,
      );
    }

    return dbToLegacyDeal({
      ...updated[0],
      categoryName: deal.category,
    });
  }

  const inserted = await db
    .insert(deals)
    .values({
      ...values,
      createdAt:
        validDate(deal.importedAt) ?? now,
      discoveredAt:
        validDate(deal.importedAt) ?? now,
    })
    .returning();

  if (!inserted[0]) {
    throw new Error(
      "D1 did not return the inserted deal.",
    );
  }

  return dbToLegacyDeal({
    ...inserted[0],
    categoryName: deal.category,
  });
}

export async function deleteLegacyDeal(
  id: number,
): Promise<void> {
  const db = getDb();

  await db
    .delete(deals)
    .where(eq(deals.id, id));
}
