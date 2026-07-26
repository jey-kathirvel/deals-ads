import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { analytics } from "@/lib/analytics/store";

export async function GET(){

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



  return NextResponse.json(
    analytics()
  );

}
