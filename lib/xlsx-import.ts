import { createHash } from "node:crypto";
import { readSheet } from "read-excel-file/node";

const required = ["title","platform","category","price","mrp","url"];
const known = ["title","platform","category","price","mrp","url","imageUrl","tag","code","couponTerms","expires","expiryDate","rating","votes"];
const categories = new Set(["Mobiles","Electronics","Fashion","Home","Beauty","Travel","Food","Finance"]);

export async function validateXlsx(buffer: Buffer) {
  if (buffer.length > 5 * 1024 * 1024) throw new Error("Workbook is larger than the 5 MB limit.");
  let matrix: unknown[][];
  try {
    matrix = await readSheet(buffer, "Deals") as unknown[][];
  } catch {
    throw new Error('The workbook must contain a readable worksheet named "Deals".');
  }
  const headers = (matrix[0] || []).map(value => String(value ?? "").trim());
  const errors: string[] = []; const warnings: string[] = [];
  for (const name of required) if (!headers.includes(name)) errors.push(`Missing required column: ${name}`);
  const unknown = headers.filter(Boolean).filter(name => !known.includes(name));
  if (unknown.length) warnings.push(`Unknown columns will be ignored: ${unknown.join(", ")}`);
  if (errors.length) return result([], errors, warnings, buffer);
  const rows: Array<Record<string,string>> = []; const seen = new Set<string>();
  matrix.slice(1).forEach((row,index) => {
    const rowNumber = index + 2;
    const values: Record<string,string> = {};
    headers.forEach((header,columnIndex) => {
      if (!header) return;
      const value = row[columnIndex];
      values[header] = value instanceof Date ? date(value) : String(value ?? "").trim();
    });
    if (!Object.values(values).some(Boolean)) return;
    for (const name of required) if (!values[name]) errors.push(`Row ${rowNumber}: ${name} is required.`);
    const price = Number(values.price); const mrp = Number(values.mrp);
    if (!Number.isFinite(price) || price <= 0) errors.push(`Row ${rowNumber}: price must be greater than zero.`);
    if (!Number.isFinite(mrp) || mrp <= 0) errors.push(`Row ${rowNumber}: mrp must be greater than zero.`);
    if (Number.isFinite(price) && Number.isFinite(mrp) && mrp < price) errors.push(`Row ${rowNumber}: mrp cannot be lower than price.`);
    if (values.url && !validUrl(values.url)) errors.push(`Row ${rowNumber}: url must be a valid HTTP or HTTPS address.`);
    if (values.imageUrl && !validUrl(values.imageUrl)) errors.push(`Row ${rowNumber}: imageUrl must be a valid HTTP or HTTPS address.`);
    if (values.category && !categories.has(values.category)) errors.push(`Row ${rowNumber}: unsupported category "${values.category}".`);
    if (values.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.expiryDate)) errors.push(`Row ${rowNumber}: expiryDate must use yyyy-mm-dd.`);
    if (values.rating && (!Number.isFinite(Number(values.rating)) || Number(values.rating) < 0 || Number(values.rating) > 5)) errors.push(`Row ${rowNumber}: rating must be between 0 and 5.`);
    if (values.votes && (!Number.isInteger(Number(values.votes)) || Number(values.votes) < 0)) errors.push(`Row ${rowNumber}: votes must be a non-negative whole number.`);
    const duplicateKey = `${values.platform?.toLowerCase()}|${values.title?.toLowerCase()}|${canonical(values.url || "")}`;
    if (seen.has(duplicateKey)) errors.push(`Row ${rowNumber}: duplicate deal inside this workbook.`);
    seen.add(duplicateKey); rows.push(values);
  });
  if (!rows.length) errors.push("The Deals sheet contains no data rows.");
  return result(rows, errors, warnings, buffer);
}

function result(rows:Array<Record<string,string>>,errors:string[],warnings:string[],buffer:Buffer) {
  return { valid:errors.length===0, rows, errors, warnings, hash:createHash("sha256").update(buffer).digest("hex") };
}
function validUrl(value:string) { try { const url=new URL(value); return url.protocol==="http:"||url.protocol==="https:"; } catch { return false; } }
function canonical(value:string) { try { const url=new URL(value); return `${url.hostname}${url.pathname}`.toLowerCase().replace(/\/$/,""); } catch { return value.toLowerCase(); } }
function date(value:Date) { return value.toISOString().slice(0,10); }
