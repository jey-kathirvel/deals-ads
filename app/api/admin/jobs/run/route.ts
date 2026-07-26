import { requireAdminSession } from "@/lib/auth/guard";
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

  try {
    const jobId = await runDealsJob(
      "quickcommerce-import",
      "admin",
    );

    return NextResponse.json({
      success: true,
      jobId,
      message: "Deals import job completed successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to run deals import job.";

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
