import { isLocked } from "@/lib/jobs/job-lock";
import { runDealsJob } from "@/lib/jobs/deals-job";
import {
  getSchedulerSettings,
  isSchedulerRunDue,
  touchSchedulerRun,
} from "./settings";

let timer: NodeJS.Timeout | undefined;

async function executeScheduledRun() {
  const settings = getSchedulerSettings();

  if (!settings.enabled) {
    return;
  }

  if (isLocked()) {
    return;
  }

  if (!isSchedulerRunDue()) {
    return;
  }

  try {
    await runDealsJob("quickcommerce-import", "system");

    touchSchedulerRun();
  } catch (error) {
    console.error("Deals Scheduler:", error);
  }
}

export function startDealsScheduler() {
  if (timer) {
    clearInterval(timer);
  }

  const settings = getSchedulerSettings();

  if (!settings.enabled) {
    return;
  }

  void executeScheduledRun();

  /*
   * Check every minute, but execute only once per India calendar day.
   */
  timer = setInterval(() => {
    void executeScheduledRun();
  }, 60 * 1000);
}

export async function runSchedulerNow() {
  if (isLocked()) {
    throw new Error("A deals import job is already running.");
  }

  if (!isSchedulerRunDue()) {
    throw new Error("QuickCommerce deals have already been fetched today.");
  }

  const jobId = await runDealsJob("quickcommerce-import", "admin");

  touchSchedulerRun();

  return jobId;
}
