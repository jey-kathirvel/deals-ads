import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { importDeals } from "@/lib/deals-store";
import { validateXlsx } from "@/lib/xlsx-import";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("file");
    const action = String(form.get("action") || "validate");
    if (!(file instanceof File)) return Response.json({error:"Select an .xlsx file."},{status:400});
    if (!file.name.toLowerCase().endsWith(".xlsx")) return Response.json({error:"Only .xlsx files are accepted."},{status:400});
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateXlsx(buffer);
    if (action === "validate") return Response.json({...validation,rows:validation.rows.slice(0,10),rowCount:validation.rows.length});
    if (!validation.valid) return Response.json({error:"Workbook validation failed.",...validation,rows:validation.rows.slice(0,10)},{status:400});
    if (String(form.get("hash") || "") !== validation.hash) return Response.json({error:"The workbook changed after validation. Validate it again."},{status:409});
    const imported = await importDeals(validation.rows,{publish:true,source:"xlsx"});
    return Response.json({...imported,published:imported.imported});
  } catch (error) {
    return Response.json({error:error instanceof Error?error.message:"Could not read the workbook."},{status:400});
  }
}
