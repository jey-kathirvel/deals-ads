import { requireAdminSession } from "@/lib/auth/guard";
import { amazonConfig, amazonItemsToCsv, fetchAmazonDeals } from "@/lib/amazon-creators";

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


  return Response.json(amazonConfig());
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


  try {
    const body = await request.json();
    const items = await fetchAmazonDeals({ count: body.count, minSavingPercent: body.minSavingPercent });
    return Response.json({ items, csv: amazonItemsToCsv(items), generatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Amazon import failed." }, { status: 400 });
  }
}
