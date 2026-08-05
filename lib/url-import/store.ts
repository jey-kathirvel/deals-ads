import fs from "node:fs";
import path from "node:path";
import type { UrlImportBatch } from "./types";

const FILE = path.join(process.cwd(), "data/url-import/batches.json");

function read(): UrlImportBatch[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}

function write(items: UrlImportBatch[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temp = `${FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(items.slice(0, 100), null, 2));
  fs.renameSync(temp, FILE);
}

export function saveBatch(batch: UrlImportBatch) {
  const items = read();
  const index = items.findIndex((item) => item.id === batch.id);
  if (index >= 0) items[index] = batch; else items.unshift(batch);
  write(items);
  return batch;
}

export function getBatch(id: string) { return read().find((item) => item.id === id) ?? null; }
export function listBatches() { return read(); }
