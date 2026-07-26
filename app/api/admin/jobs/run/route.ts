import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { runDealsJob } from "@/lib/jobs/deals-job";

export async function POST() {

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


  const id = await runDealsJob();

  return NextResponse.json({
    success: true,
    jobId: id,
  });
}
