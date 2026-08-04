import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import {
  getCurrentLock,
  isLockStale,
  releaseLock,
} from "@/lib/jobs/job-lock";
import {
  latestRun,
  recoverOrphanedRunningJobs,
} from "@/lib/jobs/job-history";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const lock = getCurrentLock();
  if (isLockStale(lock)) {
    const staleBefore = Date.now() - Number(process.env.DEALS_JOB_STALE_MS ?? 5 * 60 * 1000);
    recoverOrphanedRunningJobs(staleBefore);
    releaseLock(lock.jobId ?? undefined);
  }

  return NextResponse.json({
    lock: getCurrentLock(),
    current: latestRun(),
  });
}
