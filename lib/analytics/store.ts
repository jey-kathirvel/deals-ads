import fs from "fs";
import path from "path";

const FILE=path.join(process.cwd(),"data/analytics.json");

function read(){
  try{
    return JSON.parse(fs.readFileSync(FILE,"utf8"));
  }catch{
    return {
      totalVisits:0,
      uniqueVisitors:0,
      todayVisits:0,
      visitors:{},
      daily:{}
    };
  }
}

function write(data:any){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function registerVisit(ip:string){

  const db=read();

  const today=new Date().toISOString().substring(0,10);

  db.totalVisits++;

  if(!db.daily[today])
    db.daily[today]=0;

  db.daily[today]++;

  db.todayVisits=db.daily[today];

  if(!db.visitors[ip]){

    db.visitors[ip]=new Date().toISOString();

    db.uniqueVisitors++;

  }

  write(db);

}

export function analytics(){

  return read();

}
