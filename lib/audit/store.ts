import fs from "fs";
import path from "path";
import crypto from "crypto";

const FILE=path.join(process.cwd(),"data/audit-log.json");

export interface AuditLog{
  id:string;
  action:string;
  module:string;
  user:string;
  status:"SUCCESS"|"FAILED";
  details:any;
  createdAt:string;
}

function read():AuditLog[]{
  try{
    return JSON.parse(fs.readFileSync(FILE,"utf8"));
  }catch{
    return [];
  }
}

function write(data:AuditLog[]){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function addAudit(
  module:string,
  action:string,
  status:"SUCCESS"|"FAILED",
  details:any={},
  user="admin"
){

  const logs=read();

  logs.unshift({
    id:crypto.randomUUID(),
    module,
    action,
    status,
    user,
    details,
    createdAt:new Date().toISOString()
  });

  write(logs);

}

export function listAudit(){
  return read();
}
