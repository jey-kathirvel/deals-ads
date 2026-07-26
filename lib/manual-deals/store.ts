import { addToQueue } from "@/lib/review/store";
import { addAudit } from "@/lib/audit/store";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const FILE=path.join(process.cwd(),"data/manual-deals.json");

export interface ManualDeal{
  id:string;
  productName:string;
  category:string;
  dealPrice:number;
  originalPrice:number;
  discount:number;
  coupon:string;
  dealUrl:string;
  imageUrl:string;
  source:"manual";
  publishMode:"review"|"publish";
  status:"draft"|"review"|"published";
  createdAt:string;
}

function read():ManualDeal[]{
  try{
    return JSON.parse(fs.readFileSync(FILE,"utf8"));
  }catch{
    return [];
  }
}

function write(data:ManualDeal[]){
  const tmp=FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2));
  fs.renameSync(tmp,FILE);
}

export function listDeals(){
  return read();
}

export function saveDeal(data:Partial<ManualDeal>){

  const deals=read();

  const deal:ManualDeal={

    id:data.id??crypto.randomUUID(),

    productName:data.productName??"",

    category:data.category??"General",

    dealPrice:Number(data.dealPrice??0),

    originalPrice:Number(data.originalPrice??0),

    discount:Number(data.discount??0),

    coupon:data.coupon??"",

    dealUrl:data.dealUrl??"",

    imageUrl:data.imageUrl??"",

    source:"manual",

    publishMode:data.publishMode??"review",

    status:data.publishMode==="publish"?"published":"review",

    createdAt:new Date().toISOString()

  };

  deals.unshift(deal);

  write(deals);

  addAudit("Manual Deal","SAVE","SUCCESS",{id:deal.id});

  if(deal.publishMode==="review"){
    addToQueue({
      source:deal.source,
      productName:deal.productName,
      category:deal.category,
      dealPrice:deal.dealPrice,
      originalPrice:deal.originalPrice,
      discount:deal.discount,
      coupon:deal.coupon,
      dealUrl:deal.dealUrl,
      imageUrl:deal.imageUrl
    });
  }

return deal;

}

export function deleteDeal(id:string){

  write(read().filter(x=>x.id!==id));

}
