import { addAudit } from "@/lib/audit/store";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const FILE=path.join(process.cwd(),"data/campaigns.json");

export interface Campaign{
  id:string;
  name:string;
  placement:string;
  type:"iframe"|"image"|"html";
  title:string;
  subtitle:string;
  iframeUrl?:string;
  imageUrl?:string;
  html?:string;
  enabled:boolean;
  priority:number;
  startDate:string;
  endDate:string;
  showOnce:boolean;
  createdAt:string;
}

function read():Campaign[]{
  try{
    return JSON.parse(fs.readFileSync(FILE,"utf8"));
  }catch{
    return [];
  }
}

function write(data:Campaign[]){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function listCampaigns(){
  return read().sort((a,b)=>b.priority-a.priority);
}

export function activeCampaign(placement:string){

  const now=Date.now();

  return listCampaigns().find(c=>

    c.enabled &&

    c.placement===placement &&

    now>=new Date(c.startDate).getTime() &&

    now<=new Date(c.endDate).getTime()

  ) ?? null;

}

export function saveCampaign(data:Partial<Campaign>){

  const items=read();

  const campaign:Campaign={

    id:data.id??crypto.randomUUID(),

    name:data.name??"",

    placement:data.placement??"deals",

    type:data.type??"iframe",

    title:data.title??"",

    subtitle:data.subtitle??"",

    iframeUrl:data.iframeUrl,

    imageUrl:data.imageUrl,

    html:data.html,

    enabled:data.enabled??true,

    priority:data.priority??1,

    startDate:data.startDate??new Date().toISOString(),

    endDate:data.endDate??new Date(Date.now()+86400000).toISOString(),

    showOnce:data.showOnce??true,

    createdAt:data.createdAt??new Date().toISOString()

  };

  const index=items.findIndex(x=>x.id===campaign.id);

  if(index>=0)
    items[index]=campaign;
  else
    items.unshift(campaign);

  write(items);

  addAudit("Campaign","SAVE","SUCCESS",{id:campaign.id});

  return campaign;

}

export function deleteCampaign(id:string){

  write(read().filter(x=>x.id!==id));

}
