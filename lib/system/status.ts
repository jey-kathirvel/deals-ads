import fs from "fs";
import path from "path";
import { getSchedulerSettings } from "@/lib/scheduler/settings";
import { getCurrentLock } from "@/lib/jobs/job-lock";
import { latestRun } from "@/lib/jobs/job-history";
import { providerHealth } from "@/lib/providers/health";

function exists(file:string){
  try{
    return fs.existsSync(path.join(process.cwd(),file));
  }catch{
    return false;
  }
}

export function systemStatus(){

  const scheduler=getSchedulerSettings();
  const lock=getCurrentLock();
  const provider=providerHealth();
  const lastJob=latestRun();

  return{

    serverTime:new Date().toISOString(),

    uptime:Math.floor(process.uptime()),

    nodeVersion:process.version,

    platform:process.platform,

    pid:process.pid,

    scheduler,

    currentLock:lock,

    lastJob,

    provider,

    storage:{

      campaigns:exists("data/campaigns.json"),

      manualDeals:exists("data/manual-deals.json"),

      reviewQueue:exists("data/review-queue.json"),

      analytics:exists("data/analytics.json"),

      jobs:exists("data/jobs/runs.json"),

      audit:exists("data/audit-log.json")

    }

  };

}
