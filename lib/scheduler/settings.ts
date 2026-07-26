import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(),"data/jobs/settings.json");

export interface SchedulerSettings{
  enabled:boolean;
  intervalMinutes:number;
  maxDeals:number;
  publishMode:"review"|"publish";
  retryCount:number;
  retryDelaySeconds:number;
  timeoutMinutes:number;
  lastRun:string|null;
  nextRun:string|null;
}

export function getSchedulerSettings():SchedulerSettings{
  return JSON.parse(fs.readFileSync(FILE,"utf8"));
}

export function saveSchedulerSettings(settings:SchedulerSettings){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(settings,null,2));
  fs.renameSync(tmp,FILE);
}

export function touchSchedulerRun(){

  const settings=getSchedulerSettings();

  const now=new Date();

  settings.lastRun=now.toISOString();

  settings.nextRun=new Date(
    now.getTime()+settings.intervalMinutes*60000
  ).toISOString();

  saveSchedulerSettings(settings);

}
