import { promises as fs } from "node:fs";
import path from "node:path";
import type { Deal } from "./deal-types";

const dataDir = process.env.DEALS_DATA_DIR || path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "deals.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dataFile); } catch { await fs.writeFile(dataFile, "[]", "utf8"); }
}

export async function getDeals(includeInactive = false): Promise<Deal[]> {
  await ensureStore();
  const items = JSON.parse(await fs.readFile(dataFile, "utf8")) as Deal[];
  return items.filter((item) => includeInactive || item.active).sort((a, b) => b.id - a.id);
}

export async function saveDeal(input: Partial<Deal> & Pick<Deal, "title" | "platform" | "category" | "price" | "mrp" | "url">) {
  const items = await getDeals(true);
  const existing = input.id ? items.find((item) => item.id === input.id) : undefined;
  const deal: Deal = {
    id: existing?.id ?? Math.max(0, ...items.map((item) => item.id)) + 1,
    title: input.title.trim(), platform: input.platform.trim(), category: input.category,
    price: Number(input.price), mrp: Number(input.mrp), rating: Number(input.rating ?? 4.5),
    votes: Number(input.votes ?? 0), tag: input.tag?.trim() || "New deal", color: input.color || "#e7f1ec",
    emoji: input.emoji || "DEAL", code: input.code?.trim() || "", expires: input.expires?.trim() || "Limited time",
    url: affiliateUrl(input.url.trim(), input.platform), active: input.active ?? true, source: input.source || "manual", updatedAt: new Date().toISOString(),
  };
  const next = existing ? items.map((item) => item.id === deal.id ? deal : item) : [deal, ...items];
  await writeDeals(next);
  return deal;
}

function affiliateUrl(value: string, platform: string) {
  if (platform.toLowerCase() !== "amazon" || !process.env.AMAZON_PARTNER_TAG) return value;
  try {
    const url = new URL(value);
    if (url.hostname === "amazon.in" || url.hostname.endsWith(".amazon.in")) url.searchParams.set("tag", process.env.AMAZON_PARTNER_TAG);
    return url.toString();
  } catch { return value; }
}

export async function deleteDeal(id: number) {
  const items = await getDeals(true);
  await writeDeals(items.filter((item) => item.id !== id));
}

async function writeDeals(items: Deal[]) {
  await ensureStore();
  const temporary = `${dataFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(temporary, dataFile);
}
