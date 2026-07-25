import {
  runAmazonDiscovery,
} from "@/lib/deals-engine/services/discovery-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
}

function configuredKeywords(): string[] {
  return (
    process.env.AMAZON_DISCOVERY_KEYWORDS ||
    [
      "headphones",
      "smart watches",
      "mobile accessories",
      "kitchen appliances",
      "home appliances",
    ].join(",")
  )
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function booleanParameter(
  value: string | null,
  fallback: boolean,
): boolean {
  if (value === null) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(
    value.toLowerCase(),
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);

    const keywords = url.searchParams
      .get("keywords")
      ?.split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    const result = await runAmazonDiscovery({
      keywords:
        keywords && keywords.length > 0
          ? keywords
          : configuredKeywords(),

      searchIndex:
        url.searchParams.get("searchIndex") ||
        process.env.AMAZON_DISCOVERY_SEARCH_INDEX ||
        "All",

      minimumDiscountPercent: Number(
        url.searchParams.get("minimumDiscount") ||
        process.env.AMAZON_DISCOVERY_MINIMUM_DISCOUNT ||
        "10",
      ),

      minimumRating: Number(
        url.searchParams.get("minimumRating") ||
        process.env.AMAZON_DISCOVERY_MINIMUM_RATING ||
        "3.5",
      ),

      publish: booleanParameter(
        url.searchParams.get("publish"),
        false,
      ),

      dryRun: booleanParameter(
        url.searchParams.get("dryRun"),
        false,
      ),
    });

    return Response.json({
      ...result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Amazon discovery failed:", error);

    return Response.json(
      {
        error: "Amazon discovery failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
