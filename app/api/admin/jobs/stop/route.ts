import { requireAdminSession } from "@/lib/auth/guard";
import { appendRunEvent, getRun } from "@/lib/jobs/job-history";
import { getCurrentLock, markLockStopRequested } from "@/lib/jobs/job-lock";
import { requestJobStop } from "@/lib/jobs/job-control";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  const lock = getCurrentLock();
  const jobId = body.jobId?.trim() || lock.jobId;

  if (!jobId || !lock.locked || lock.jobId !== jobId) {
    return NextResponse.json(
      { success: false, message: "No matching running job was found." },
      { status: 409 },
    );
  }

  const run = getRun(jobId);
  if (!run || run.status !== "running") {
    return NextResponse.json(
      { success: false, message: "The selected job is no longer running." },
      { status: 409 },
    );
  }

  markLockStopRequested(jobId);
  appendRunEvent(
    jobId,
    "cancelled",
    "Manual stop requested by an administrator. Cancelling active provider request.",
  );
  const abortedInProcess = requestJobStop(jobId);

  return NextResponse.json({
    success: true,
    jobId,
    message: abortedInProcess
      ? "Stop requested. The active request was aborted."
      : "Stop requested. The job will stop at the next cancellation checkpoint.",
  });
}
