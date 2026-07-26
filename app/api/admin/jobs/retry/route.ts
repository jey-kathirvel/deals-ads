import { requireAdminSession } from "@/lib/auth/guard";
import { latestRun } from "@/lib/jobs/job-history";
import { runDealsJob } from "@/lib/jobs/deals-job";
import { isLocked } from "@/lib/jobs/job-lock";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  if (isLocked()) {
    return NextResponse.json(
      {
        success: false,
        message: "A deals import job is already running.",
      },
      {
        status: 409,
      },
    );
  }

  const latestJob = latestRun();

  if (!latestJob || latestJob.status !== "failed") {
    return NextResponse.json(
      {
        success: false,
        message: "No failed job is available for retry.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const jobId = await runDealsJob(
      latestJob.type,
      "admin",
    );

    return NextResponse.json({
      success: true,
      jobId,
      retriedJobId: latestJob.id,
      message: "Failed job retried successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retry failed job.";

    const status = message
      .toLowerCase()
      .includes("already running")
      ? 409
      : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status,
      },
    );
  }
}
