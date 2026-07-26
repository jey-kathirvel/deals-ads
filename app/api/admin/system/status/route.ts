import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { systemStatus } from "@/lib/system/status";

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


  return NextResponse.json(systemStatus());
}
