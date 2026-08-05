import { requireAdminSession } from "@/lib/auth/guard";
import { analyzeUrlBatch } from "@/lib/url-import/service";
import { registerUrlImport, unregisterUrlImport } from "@/lib/url-import/control";

export async function POST(request: Request) {
  try { await requireAdminSession(); } catch { return Response.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
  let runId = "";
  try {
    const body = await request.json();
    runId = String(body.runId ?? crypto.randomUUID());
    const controller = registerUrlImport(runId);
    const urls = Array.isArray(body.urls) ? body.urls : String(body.urls ?? "").split(/\r?\n/);
    const batch = await analyzeUrlBatch({ urls, autoPublish: body.autoPublish, minimumDiscount: body.minimumDiscount, minimumScore: body.minimumScore }, controller.signal);
    return Response.json({ success: true, runId, batch });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyse URLs.";
    return Response.json({ success: false, runId, message: message === "IMPORT_STOPPED" ? "URL import stopped manually." : message }, { status: message === "IMPORT_STOPPED" ? 409 : 400 });
  } finally {
    if (runId) unregisterUrlImport(runId);
  }
}
