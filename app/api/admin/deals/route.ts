import { deleteDeal, getDeals, saveDeal } from "@/lib/deals-store";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  return Response.json(await getDeals(true));
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = await request.json();
  if (!body.title || !body.url || !body.platform || !body.category || Number(body.price) < 0 || Number(body.mrp) <= 0) return Response.json({ error: "Complete all required fields." }, { status: 400 });
  return Response.json(await saveDeal(body), { status: 201 });
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = await request.json();
  if (!body.id) return Response.json({ error: "Deal ID is required." }, { status: 400 });
  return Response.json(await saveDeal(body));
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "Deal ID is required." }, { status: 400 });
  await deleteDeal(id); return new Response(null, { status: 204 });
}
