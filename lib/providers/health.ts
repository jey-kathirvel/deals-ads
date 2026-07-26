import { addAudit } from "@/lib/audit/store";
import fs from "fs";
import path from "path";

const FILE=path.join(process.cwd(),"data/provider-health.json");

function read(){
  try{
    return JSON.parse(fs.readFileSync(FILE,"utf8"));
  }catch{
    return {};
  }
}

function write(data:any){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function providerHealth(){
  return read();
}

export function markProviderSuccess(provider:string,responseMs:number,httpStatus:number){

  const db=read();

  if(!db[provider]) return;

  db[provider].status="UP";
  db[provider].lastSuccess=new Date().toISOString();
  db[provider].lastResponseTimeMs=responseMs;
  db[provider].lastHttpStatus=httpStatus;
  db[provider].totalRequests++;
  db[provider].successfulRequests++;

  write(db);

  addAudit("Provider","HEALTH_UPDATE","SUCCESS",{provider});

}

export function markProviderFailure(provider:string,error:string,httpStatus:number=500){

  const db=read();

  if(!db[provider]) return;

  db[provider].status="DOWN";
  db[provider].lastFailure=new Date().toISOString();
  db[provider].lastHttpStatus=httpStatus;
  db[provider].lastError=error;
  db[provider].totalRequests++;
  db[provider].failedRequests++;

  write(db);

  addAudit("Provider","HEALTH_UPDATE","SUCCESS",{provider});

}
