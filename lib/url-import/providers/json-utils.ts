export function safeJsonParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return undefined; }
}

export function collectJsonObjects(root: unknown, limit = 15000): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  const queue: unknown[] = [root];
  const seen = new Set<object>();
  let inspected = 0;
  while (queue.length && inspected < limit) {
    const value = queue.shift(); inspected += 1;
    if (!value || typeof value !== "object") continue;
    if (seen.has(value as object)) continue;
    seen.add(value as object);
    if (!Array.isArray(value)) result.push(value as Record<string, unknown>);
    for (const child of Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return result;
}

export function firstString(objects: Record<string, unknown>[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

export function firstNumber(objects: Record<string, unknown>[], keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      const number = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
      if (Number.isFinite(number) && number > 0) return number;
    }
  }
  return Number.NaN;
}
