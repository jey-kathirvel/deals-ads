import fs from "node:fs";
import path from "node:path";
import { slugify } from "@/lib/slug";

const FILE = path.join(process.cwd(), "data/url-import/categories.json");
const DEFAULTS = ["Electronics", "Mobiles", "Fashion", "Grocery", "Home & Kitchen", "Beauty", "Health", "Baby Care", "Sports", "Books", "Uncategorized"];

type CategoryRecord = { name: string; slug: string; aliases: string[]; createdAt: string };

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\b(accessories|products|items)\b/g, "").replace(/\s+/g, " ");
}

function read(): CategoryRecord[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {
    return DEFAULTS.map((name) => ({ name, slug: slugify(name), aliases: [], createdAt: new Date().toISOString() }));
  }
}

function write(items: CategoryRecord[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temp = `${FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(items, null, 2));
  fs.renameSync(temp, FILE);
}

export function resolveDynamicCategory(rawCategory?: string) {
  const requested = rawCategory?.trim() || "Uncategorized";
  const normalized = normalize(requested);
  const items = read();
  const existing = items.find((item) => normalize(item.name) === normalized || item.aliases.some((alias) => normalize(alias) === normalized));
  if (existing) return { category: existing.name, action: existing.name === "Uncategorized" ? "fallback" as const : "existing" as const };
  const created: CategoryRecord = { name: requested, slug: slugify(requested) || `category-${Date.now()}`, aliases: [], createdAt: new Date().toISOString() };
  items.push(created);
  write(items);
  return { category: created.name, action: "created" as const };
}
