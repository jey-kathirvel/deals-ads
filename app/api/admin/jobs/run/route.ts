import { requireAdminSession } from "@/lib/auth/guard";
import {
  getManualDealsJobDefaults,
  runDealsJob,
  type ManualDealsJobParameters,
} from "@/lib/jobs/deals-job";
import { isLocked } from "@/lib/jobs/job-lock";
import { NextResponse } from "next/server";

async function authorized(): Promise<boolean> {
  try {
    await requireAdminSession();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json(getManualDealsJobDefaults());
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be a list.`);
  }

  const values = value.map((item) => String(item).trim()).filter(Boolean);

  if (!values.length) {
    throw new Error(`${field} must contain at least one value.`);
  }

  return Array.from(new Set(values));
}

function numberInRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${field} must be between ${minimum} and ${maximum}.`);
  }

  return parsed;
}

function parametersFrom(
  value: unknown,
  grocery: boolean,
): ManualDealsJobParameters {
  if (!value || typeof value !== "object") {
    throw new Error("Job parameters are required.");
  }

  const body = value as Record<string, unknown>;

  return {
    limit: Math.round(
      numberInRange(body.limit, "Deal limit", grocery ? 20 : 1, 50),
    ),
    minimumDiscountPercent: numberInRange(
      body.minimumDiscountPercent,
      "Minimum discount",
      0,
      100,
    ),
    keywords: stringList(body.keywords, "Keywords"),
    platforms: stringList(body.platforms, "Platforms"),
    latitude: numberInRange(body.latitude, "Latitude", -90, 90),
    longitude: numberInRange(body.longitude, "Longitude", -180, 180),
    pincode:
      typeof body.pincode === "string" && body.pincode.trim()
        ? body.pincode.trim()
        : undefined,
  };
}

export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
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
    const body = (await request.json()) as {
      jobType?: unknown;
      parameters?: unknown;
    };
    const grocery = body.jobType === "grocery-import";

    if (
      body.jobType !== "quickcommerce-import" &&
      body.jobType !== "grocery-import"
    ) {
      throw new Error("Choose Daily Deals or Grocery Deals.");
    }

    const parameters = parametersFrom(body.parameters, grocery);
    const jobId = await runDealsJob(body.jobType, "admin", parameters);

    return NextResponse.json({
      success: true,
      jobId,
      message: `${grocery ? "Grocery Deals" : "Daily Deals"} job completed.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to run deals import job.";

    const status = message.toLowerCase().includes("already running")
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
