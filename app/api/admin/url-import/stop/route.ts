import { requireAdminSession } from "@/lib/auth/guard";
import { stopUrlImport } from "@/lib/url-import/control";

export async function POST(request: Request) {
  try { await requireAdminSession(); } catch { return Response.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
  const body = await request.json();
  const runId = String(body.runId ?? "");
  if (!runId) return Response.json({ success: false, message: "runId is required." }, { status: 400 });
  const stopped = stopUrlImport(runId);
  return Response.json({ success: true, stopped, message: stopped ? "Stop requested. The active URL request will be aborted." : "No active import was found." });
}
