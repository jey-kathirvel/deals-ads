import { requireAdminSession } from "@/lib/auth/guard";
import { commitUrlBatch } from "@/lib/url-import/service";

export async function POST(request: Request) {
  try { await requireAdminSession(); } catch { return Response.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
  try {
    const body = await request.json();
    const batch = await commitUrlBatch(String(body.batchId ?? ""), Array.isArray(body.selectedItemIds) ? body.selectedItemIds : undefined);
    return Response.json({ success: true, batch });
  } catch (error) {
    return Response.json({ success: false, message: error instanceof Error ? error.message : "Unable to import deals." }, { status: 400 });
  }
}
