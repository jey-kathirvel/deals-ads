import { importDeals } from "@/lib/deals-store";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const text = await request.text();
  const rows = parseCsv(text);
  if (!rows.length) return Response.json({ error: "No valid CSV records found." }, { status: 400 });
  return Response.json(await importDeals(rows), { status: 201 });
}

function parseCsv(text: string) {
  const records: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field); if (row.some((value) => value.trim())) records.push(row); row = []; field = "";
    } else field += char;
  }
  row.push(field); if (row.some((value) => value.trim())) records.push(row);
  if (records.length < 2) return [];
  const headers = records[0].map((header) => header.trim());
  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])));
}
