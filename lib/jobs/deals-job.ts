import { acquireLock, releaseLock } from "./job-lock";
import { createRun, finishRun, updateRun } from "./job-history";
import { JobType } from "./job-types";

/*
 * Replace this import with your existing Quickcommerce service.
 * Example:
 *
 * import { runQuickcommerceImport } from "@/lib/quickcommerce/import";
 *
 */
async function executeProviderImport(progress: (current:number,total:number)=>void) {

  // ===== REPLACE WITH EXISTING QUICKCOMMERCE IMPORT =====

  const total = 100;

  for (let i = 1; i <= total; i++) {
    await new Promise((r) => setTimeout(r, 15));
    progress(i, total);
  }

  return {
    imported: 94,
    updated: 4,
    skipped: 2,
    failed: 0,
    message: "Quickcommerce import completed"
  };
}

export async function runDealsJob(
  type: JobType = "quickcommerce-import",
  triggeredBy: "admin" | "system" = "admin",
) {

  const run = createRun(type, triggeredBy);

  acquireLock(run.id);

  try {

    const result = await executeProviderImport((current,total)=>{

      updateRun(run.id,{
        progress: current,
        total,
      });

    });

    finishRun(run.id,"success",{
      progress:100,
      total:100,
      imported:result.imported,
      updated:result.updated,
      skipped:result.skipped,
      failed:result.failed,
      message:result.message,
    });

    return run.id;

  } catch(error){

    finishRun(run.id,"failed",{
      error:error instanceof Error ? error.message : "Unknown error"
    });

    throw error;

  } finally {

    releaseLock();

  }
}
