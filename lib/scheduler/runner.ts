import { getSchedulerSettings,touchSchedulerRun } from "./settings";
import { runDealsJob } from "@/lib/jobs/deals-job";

let timer:NodeJS.Timeout|undefined;

export function startDealsScheduler(){

  if(timer) clearInterval(timer);

  const settings=getSchedulerSettings();

  if(!settings.enabled) return;

  timer=setInterval(async()=>{

    try{

      await runDealsJob(
        "quickcommerce-import",
        "system"
      );

      touchSchedulerRun();

    }catch(err){

      console.error("Deals Scheduler:",err);

    }

  },settings.intervalMinutes*60000);

}

export async function runSchedulerNow(){

  await runDealsJob(
    "quickcommerce-import",
    "admin"
  );

  touchSchedulerRun();

}
