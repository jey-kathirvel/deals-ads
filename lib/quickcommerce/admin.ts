import { addAudit } from "@/lib/audit/store";
import { markProviderSuccess, markProviderFailure } from "@/lib/providers/health";
import { runDealsJob } from "@/lib/jobs/deals-job";

export async function testConnection() {

  const started = Date.now();

  try {

    /*
     * TODO
     * Replace with existing Quickcommerce client health endpoint.
     */

    const response = {
      ok: true,
      status: 200
    };

    markProviderSuccess(
      "quickcommerce",
      Date.now() - started,
      response.status
    );

    addAudit(
      "Quickcommerce",
      "TEST_CONNECTION",
      "SUCCESS",
      response
    );

    return response;

  } catch (e:any) {

    markProviderFailure(
      "quickcommerce",
      e.message
    );

    addAudit(
      "Quickcommerce",
      "TEST_CONNECTION",
      "FAILED",
      {
        error:e.message
      }
    );

    throw e;

  }

}

export async function syncNow(){

  await runDealsJob(
    "quickcommerce-import",
    "admin"
  );

  addAudit(
    "Quickcommerce",
    "SYNC_NOW",
    "SUCCESS",
    {}
  );

  return {
    success:true
  };

}
