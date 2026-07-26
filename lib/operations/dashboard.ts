import { history, latestRun } from "@/lib/jobs/job-history";
import { getCurrentLock } from "@/lib/jobs/job-lock";
import { getSchedulerSettings } from "@/lib/scheduler/settings";
import fs from "fs";
import path from "path";

const ANALYTICS_FILE = path.join(process.cwd(), "data/analytics.json");

function analytics() {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf8"));
  } catch {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      todayVisits: 0
    };
  }
}

export function operationsDashboard() {

  const jobs = history();

  const latest = latestRun();

  const scheduler = getSchedulerSettings();

  const lock = getCurrentLock();

  const stats = analytics();

  return {

    scheduler,

    lock,

    latestJob: latest,

    jobs,

    analytics: stats,

    summary: {

      totalJobs: jobs.length,

      successfulJobs: jobs.filter(j => j.status === "success").length,

      failedJobs: jobs.filter(j => j.status === "failed").length,

      runningJobs: lock.locked ? 1 : 0

    }

  };

}
