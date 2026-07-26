import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { latestRun } from "@/lib/jobs/job-history";
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


  const job = latestRun();

  if (!job || job.status !== "failed") {
    return NextResponse.json(
      { error: "No failed job available." },
      { status: 400 },
    );
  }

  const id = await runDealsJob(job.type, "admin");

  return NextResponse.json({
    success: true,
    jobId: id,
  });
}
