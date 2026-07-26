import { NextRequest,NextResponse } from "next/server";
import { registerVisit } from "@/lib/analytics/store";

export async function POST(req:NextRequest){

  const ip=

    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||

    req.headers.get("x-real-ip") ||

    "unknown";

  registerVisit(ip);

  return NextResponse.json({
    success:true
  });

}
