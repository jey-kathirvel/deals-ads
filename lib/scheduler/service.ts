import { isLocked } from "@/lib/jobs/job-lock";
import { runDealsJob } from "@/lib/jobs/deals-job";
import {
  getSchedulerSettings,
  isSchedulerRunDue,
  touchSchedulerRun,
} from "./settings";

let started = false;
let timer: NodeJS.Timeout | null = null;

async function tick() {
  try {
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

    await runDealsJob("quickcommerce-import", "system");

    touchSchedulerRun();
  } catch (error) {
    console.error("[Deals Scheduler]", error);
  }
}

export function startScheduler() {
  if (started) {
    return;
  }

  started = true;

  void tick();

  /*
   * The timer only checks whether the daily job is due.
   * isSchedulerRunDue() prevents multiple fetches on the same day.
   */
  timer = setInterval(() => {
    void tick();
  }, 60 * 1000);
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  started = false;
}
