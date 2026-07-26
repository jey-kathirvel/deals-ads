import { addAudit } from "@/lib/audit/store";
import fs from "fs";
import path from "path";

const FILE=path.join(process.cwd(),"data/system-settings.json");

function read(){
  return JSON.parse(fs.readFileSync(FILE,"utf8"));
}

function write(data:any){
  data.updatedAt=new Date().toISOString();
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function getSettings(){
  return read();
}

export function saveSettings(settings:any){
  write(settings);
  addAudit("Settings","UPDATE","SUCCESS",{});

  return settings;
}
