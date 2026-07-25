import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Deal } from "@/lib/deal-types";
import { withAmazonAssociateTag } from "@/lib/amazon-affiliate-url";

const dataFile = join(
  process.env.DEALS_DATA_DIR || join(process.cwd(), "data"),
  "deals.json",
);

let mutationQueue: Promise<void> = Promise.resolve();

function clone(deal: Deal): Deal {
  return { ...deal };
}

function normalizedDeal(value: unknown): Deal | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Deal>;
  if (
    typeof item.id !== "number" ||
    typeof item.title !== "string" ||
    typeof item.platform !== "string" ||
    typeof item.category !== "string" ||
    typeof item.price !== "number" ||
    typeof item.mrp !== "number" ||
    typeof item.url !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    title: item.title,
    platform: item.platform,
    category: item.category,
    price: item.price,
    mrp: item.mrp,
    rating: Number(item.rating ?? 0),
    votes: Number(item.votes ?? 0),
    tag: item.tag ?? "New deal",
    color: item.color ?? "#e7f1ec",
    emoji: item.emoji ?? "DEAL",
    imageUrl: item.imageUrl ?? "",
    code: item.code ?? "",
    expires: item.expires ?? "Limited time",
    url: withAmazonAssociateTag(item.url, item.platform),
    active: item.active ?? true,
    source: item.source ?? "manual",
    status: item.status ?? "published",
    expiryDate: item.expiryDate ?? "",
    couponTerms: item.couponTerms ?? "",
    sourceUrl: item.sourceUrl ?? item.url,
    lastCheckedAt: item.lastCheckedAt ?? item.updatedAt ?? new Date().toISOString(),
    importedAt: item.importedAt ?? item.updatedAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
    providerItemId: item.providerItemId,
    providerPlatform: item.providerPlatform,
  };
}

async function readDeals(): Promise<Deal[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile, "utf8"));
    return Array.isArray(parsed)
      ? parsed.map(normalizedDeal).filter((deal): deal is Deal => deal !== null)
      : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeDeals(deals: readonly Deal[]): Promise<void> {
  await mkdir(dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(deals, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFile, dataFile);
}

async function mutate<T>(
  operation: (deals: Deal[]) => Promise<T> | T,
): Promise<T> {
  let resolveResult: (value: T) => void = () => undefined;
  let rejectResult: (reason: unknown) => void = () => undefined;
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  mutationQueue = mutationQueue.then(async () => {
    try {
      const deals = await readDeals();
      const value = await operation(deals);
      await writeDeals(deals);
      resolveResult(value);
    } catch (error) {
      rejectResult(error);
    }
  });
  return result;
}

export async function getLegacyDeals(): Promise<Deal[]> {
  await mutationQueue;
  return (await readDeals()).map(clone);
}

export async function persistLegacyDeal(deal: Deal): Promise<Deal> {
  return mutate((deals) => {
    const now = new Date().toISOString();
    const index = deal.id > 0
      ? deals.findIndex((item) => item.id === deal.id)
      : -1;
    const persisted = {
      ...clone(deal),
      id: index >= 0
        ? deals[index].id
        : Math.max(0, ...deals.map((item) => item.id)) + 1,
      updatedAt: now,
    };
    if (index >= 0) deals[index] = persisted;
    else deals.push(persisted);
    return clone(persisted);
  });
}

export async function deleteLegacyDeal(id: number): Promise<void> {
  await mutate((deals) => {
    const index = deals.findIndex((deal) => deal.id === id);
    if (index >= 0) deals.splice(index, 1);
  });
}
