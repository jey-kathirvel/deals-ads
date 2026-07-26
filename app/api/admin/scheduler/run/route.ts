import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { runSchedulerNow } from "@/lib/scheduler/runner";

export async function POST(){

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



  await runSchedulerNow();

  return NextResponse.json({
    success:true
  });

}
