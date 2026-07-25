import {
  QuickCommerceClient,
  QuickCommerceDailyDealsService,
  quickCommerceOptionsFromEnvironment,
} from "@/lib/quickcommerce";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
    request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.QUICKCOMMERCE_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "QUICKCOMMERCE_API_KEY is not configured." },
      { status: 503 },
    );
  }
  try {
    const client = new QuickCommerceClient({
      apiKey,
      baseUrl: process.env.QUICKCOMMERCE_API_BASE_URL,
    });
    const service = new QuickCommerceDailyDealsService(client);
    const result = await service.run(quickCommerceOptionsFromEnvironment());
    return Response.json({
      ...result,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("QuickCommerce daily run failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "QuickCommerce daily run failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
