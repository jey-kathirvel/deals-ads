import { NextRequest, NextResponse } from "next/server";
import { runDealsJob } from "@/lib/jobs/deals-job";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();

  if (!configuredSecret) {
    return false;
  }

  const authorization =
    request.headers.get("authorization")?.trim() ?? "";

  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  const headerSecret =
    request.headers.get("x-cron-secret")?.trim() ?? "";

  return (
    bearerSecret === configuredSecret ||
    headerSecret === configuredSecret
  );
}

async function execute(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const runId = await runDealsJob(
      "grocery-import",
      "system",
    );

    return NextResponse.json({
      success: true,
      jobType: "grocery-import",
      runId,
      minimumRequestedDeals: 20,
      retention:
        "Existing active Grocery deals retained.",
      cleanup:
        "Only inactive or expired Grocery deals removed.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Grocery job failure.";

    const locked =
      /lock|already running|in progress/i.test(message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: locked ? 409 : 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  return execute(request);
}

export async function GET(request: NextRequest) {
  return execute(request);
}
