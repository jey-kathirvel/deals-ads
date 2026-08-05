import { requireAdminSession } from "@/lib/auth/guard";
import { listBatches } from "@/lib/url-import/store";

export async function GET() {
  try { await requireAdminSession(); } catch { return Response.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
  return Response.json({ success: true, batches: listBatches() });
}
