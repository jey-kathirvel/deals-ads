import {
  QuickCommerceClient,
  QuickCommerceDailyDealsService,
  quickCommerceOptionsFromEnvironment,
} from "@/lib/quickcommerce";
import { acquireLock, releaseLock } from "./job-lock";
import { createRun, finishRun, updateRun } from "./job-history";
import type { JobType } from "./job-types";

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

  const result = await service.run(quickCommerceOptionsFromEnvironment());

  progress(90, 100);

  const failed = result.importErrors.length + result.providerFailures.length;

  return {
    imported: result.imported,
    updated: 0,
    skipped: result.skipped,
    deleted: result.deleted,
    failed,
    message: [
      "QuickCommerce daily import completed.",
      `${result.checked} existing deals checked.`,
      `${result.deleted} inactive or expired deals deleted.`,
      `${result.retainedOnError} deals retained after provider errors.`,
    ].join(" "),
  };
}

export async function runDealsJob(
  type: JobType = "quickcommerce-import",
  triggeredBy: "admin" | "system" = "admin",
) {
  const run = createRun(type, triggeredBy);

  acquireLock(run.id);

  try {
    if (type !== "quickcommerce-import" && type !== "full-import") {
      throw new Error(`Unsupported deals job type: ${type}`);
    }

    const result = await executeProviderImport((current, total) => {
      updateRun(run.id, {
        progress: current,
        total,
      });
    });

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

    return run.id;
  } catch (error) {
    finishRun(run.id, "failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  } finally {
    releaseLock();
  }
}
