import { NextResponse } from "next/server";
import { activeCampaign } from "@/lib/campaigns/store";

export async function GET(req:Request){

  const {searchParams}=new URL(req.url);

  return NextResponse.json(

    activeCampaign(

      searchParams.get("placement")??"deals"

    )

  );

}
