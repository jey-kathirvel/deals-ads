import { timingSafeEqual } from "node:crypto";

export function isAdminRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  const [email, password] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
  return safeEqual(email, process.env.ADMIN_EMAIL || "") && safeEqual(password, process.env.ADMIN_PASSWORD || "");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function unauthorized() {
  return new Response("Admin sign-in required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Deals Admin", charset="UTF-8"' } });
}
