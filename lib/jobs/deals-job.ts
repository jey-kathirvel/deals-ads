import {
  QuickCommerceClient,
  QuickCommerceDailyDealsService,
  quickCommerceGroceryOptionsFromEnvironment,
  quickCommerceOptionsFromEnvironment,
} from "@/lib/quickcommerce";
import { revalidatePath, revalidateTag } from "next/cache";
import { acquireLock, heartbeatLock, releaseLock } from "./job-lock";
import { appendRunEvent, cancelRun, createRun, finishRun, updateRun } from "./job-history";
import type { JobType } from "./job-types";
import {
  JobCancelledError,
  registerJobController,
  throwIfJobStopRequested,
  unregisterJobController,
} from "./job-control";

export interface ManualDealsJobParameters {
  limit: number;
  minimumDiscountPercent: number;
  keywords: string[];
  platforms: string[];
  latitude: number;
  longitude: number;
  pincode?: string;
}

interface ProviderImportResult {
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  failed: number;
  message: string;
}

async function executeProviderImport(
  progress: (current: number, total: number) => void,
  event: (
    stage: "search" | "selection" | "import" | "validation" | "cleanup",
    message: string,
    progress?: number,
  ) => void,
  mode: "general" | "grocery" = "general",
  parameters?: ManualDealsJobParameters,
  signal?: AbortSignal,
  assertNotCancelled?: () => void,
): Promise<ProviderImportResult> {
  const apiKey = process.env.QUICKCOMMERCE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("QUICKCOMMERCE_API_KEY is not configured.");
  }

  progress(10, 100);

  const client = new QuickCommerceClient({
    apiKey,
    baseUrl: process.env.QUICKCOMMERCE_API_BASE_URL,
  });

  const service = new QuickCommerceDailyDealsService(client);

  progress(25, 100);

  const environmentOptions =
    mode === "grocery"
      ? quickCommerceGroceryOptionsFromEnvironment()
      : quickCommerceOptionsFromEnvironment();

  const result = await service.run({
    ...environmentOptions,
    ...(parameters ?? {}),
    categoryScope:
      mode === "grocery" ? "Grocery" : environmentOptions.categoryScope,
    cleanupScope:
      mode === "grocery" ? "grocery" : environmentOptions.cleanupScope,
    signal,
    assertNotCancelled,
    onProgress: ({ stage, message, progress: eventProgress }) =>
      event(stage, message, eventProgress),
  });

  progress(90, 100);

  const failed = result.importErrors.length + result.providerFailures.length;

  return {
    imported: result.imported,
    updated: 0,
    skipped: result.skipped,
    deleted: result.deleted,
    failed,
    message: [
      mode === "grocery"
        ? "Isolated Grocery daily import completed."
        : "QuickCommerce daily import completed.",
      `${result.checked} existing deals checked.`,
      `${result.validationSkipped} selected-platform deals skipped because they were checked within 72 hours.`,
      `${result.unsupportedPlatforms.length} unsupported platforms disabled; ${result.unsupportedSearchesSkipped} repeated searches avoided.`,
      `${result.deleted} inactive or expired deals deleted.`,
      `${result.retainedOnError} deals retained after provider errors.`,
    ].join(" "),
  };
}

export async function runDealsJob(
  type: JobType = "quickcommerce-import",
  triggeredBy: "admin" | "system" = "admin",
  parameters?: ManualDealsJobParameters,
) {
  const run = createRun(type, triggeredBy);

  acquireLock(run.id);
  const controller = registerJobController(run.id);
  const assertNotCancelled = () => {
    heartbeatLock(run.id);
    throwIfJobStopRequested(run.id, controller.signal);
  };

  try {
    if (
      type !== "quickcommerce-import" &&
      type !== "grocery-import" &&
      type !== "full-import"
    ) {
      throw new Error(`Unsupported deals job type: ${type}`);
    }

    const result = await executeProviderImport(
      (current, total) => {
        assertNotCancelled();
        updateRun(run.id, {
          progress: current,
          total,
        });
      },
      (stage, message, current) => {
        assertNotCancelled();
        appendRunEvent(run.id, stage, message);
        if (typeof current === "number") {
          updateRun(run.id, {
            progress: Math.min(99, Math.max(0, current)),
            total: 100,
          });
        }
      },
      type === "grocery-import" ? "grocery" : "general",
      parameters,
      controller.signal,
      assertNotCancelled,
    );

    finishRun(run.id, result.failed > 0 ? "partial_success" : "success", {
      progress: 100,
      total: 100,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      deleted: result.deleted,
      failed: result.failed,
      message: result.message,
    });
    appendRunEvent(
      run.id,
      "complete",
      `${result.message} Imported ${result.imported}; deleted ${result.deleted}; failures ${result.failed}.`,
    );
    revalidateTag("grocery-deals", "max");
    revalidatePath("/", "page");
    revalidatePath("/grocery", "page");

    return run.id;
  } catch (error) {
    if (
      error instanceof JobCancelledError ||
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      cancelRun(run.id, "Job stopped manually by an administrator.");
      return run.id;
    }

    appendRunEvent(
      run.id,
      "error",
      error instanceof Error ? error.message : "Unknown error",
    );
    finishRun(run.id, "failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  } finally {
    unregisterJobController(run.id);
    releaseLock(run.id);
  }
}

export function getManualDealsJobDefaults(): {
  daily: ManualDealsJobParameters;
  grocery: ManualDealsJobParameters;
} {
  const toParameters = (
    options: ReturnType<typeof quickCommerceOptionsFromEnvironment>,
  ): ManualDealsJobParameters => ({
    limit: options.limit,
    minimumDiscountPercent: options.minimumDiscountPercent,
    keywords: options.keywords,
    platforms: options.platforms,
    latitude: options.latitude,
    longitude: options.longitude,
    pincode: options.pincode,
  });

  return {
    daily: toParameters(quickCommerceOptionsFromEnvironment()),
    grocery: toParameters(quickCommerceGroceryOptionsFromEnvironment()),
  };
}
