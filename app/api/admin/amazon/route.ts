import { isAdminRequest, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const required = ["AMAZON_CREATORS_CREDENTIAL_ID", "AMAZON_CREATORS_CREDENTIAL_SECRET", "AMAZON_CREATORS_CREDENTIAL_VERSION", "AMAZON_PARTNER_TAG"];
  const missing = required.filter((key) => !process.env[key]);
  return Response.json({ ready: missing.length === 0, missing, marketplace: "www.amazon.in", api: "Amazon Creators API" });
}
