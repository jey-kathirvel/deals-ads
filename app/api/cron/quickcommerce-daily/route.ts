import { isLocked } from "@/lib/jobs/job-lock";
import { runDealsJob } from "@/lib/jobs/deals-job";
import { isSchedulerRunDue, touchSchedulerRun } from "@/lib/scheduler/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  if (!process.env.QUICKCOMMERCE_API_KEY?.trim()) {
    return Response.json(
      {
        error: "QUICKCOMMERCE_API_KEY is not configured.",
      },
      {
        status: 503,
      },
    );
  }

  if (isLocked()) {
    return Response.json(
      {
        error: "A deals import job is already running.",
      },
      {
        status: 409,
      },
    );
  }

  if (!isSchedulerRunDue()) {
    return Response.json({
      success: true,
      skipped: true,
      reason: "QuickCommerce deals have already been fetched today.",
    });
  }

  try {
    const jobId = await runDealsJob("quickcommerce-import", "system");

    const completedAt = new Date();

    touchSchedulerRun(completedAt);

    return Response.json({
      success: true,
      skipped: false,
      jobId,
      completedAt: completedAt.toISOString(),
    });
  } catch (error) {
    console.error("QuickCommerce daily run failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      {
        error: "QuickCommerce daily run failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
