import { requireAdminSession } from "@/lib/auth/guard";
import { deleteDeal, getDeals, saveDeal } from "@/lib/deals-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }


  return Response.json(await getDeals(true));
}

export async function POST(request: Request) {

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }


  const body = await request.json();
  if (!body.title || !body.url || !body.platform || !body.category || Number(body.price) < 0 || Number(body.mrp) <= 0) return Response.json({ error: "Complete all required fields." }, { status: 400 });
  return Response.json(await saveDeal(body), { status: 201 });
}

export async function PUT(request: Request) {

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }


  const body = await request.json();
  if (!body.id) return Response.json({ error: "Deal ID is required." }, { status: 400 });
  return Response.json(await saveDeal(body));
}

export async function DELETE(request: Request) {

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }


  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "Deal ID is required." }, { status: 400 });
  await deleteDeal(id); return new Response(null, { status: 204 });
}
