import { getSchedulerSettings, touchSchedulerRun } from "./settings";
import { isLocked } from "@/lib/jobs/job-lock";
import { runDealsJob } from "@/lib/jobs/deals-job";

let started = false;
let timer: NodeJS.Timeout | null = null;

function due(nextRun: string | null): boolean {
  if (!nextRun) return true;
  return Date.now() >= new Date(nextRun).getTime();
}

async function tick() {
  try {
    const settings = getSchedulerSettings();

    if (!settings.enabled) return;

    if (isLocked()) return;

    if (!due(settings.nextRun)) return;

    await runDealsJob(
      "quickcommerce-import",
      "system"
    );

    touchSchedulerRun();

  } catch (err) {
    console.error("[Deals Scheduler]", err);
  }
}

export function startScheduler() {

  if (started) return;

  started = true;

  tick();

  timer = setInterval(tick, 60 * 1000);
}

export function stopScheduler() {

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  started = false;
}
