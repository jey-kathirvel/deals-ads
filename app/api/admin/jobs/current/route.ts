import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { getCurrentLock } from "@/lib/jobs/job-lock";
import { latestRun } from "@/lib/jobs/job-history";

export async function GET() {

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


  return NextResponse.json({
    lock: getCurrentLock(),
    current: latestRun(),
  });
}
