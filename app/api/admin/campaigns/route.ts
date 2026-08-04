import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import {
listCampaigns,
saveCampaign,
deleteCampaign
} from "@/lib/campaigns/store";

export async function GET(){

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }


  return NextResponse.json(listCampaigns());
}

export async function POST(req:Request){

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }



  try {
    return NextResponse.json(saveCampaign(await req.json()));
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to save campaign",
      },
      { status: 400 },
    );
  }

}

export async function DELETE(req:Request){

  try{
    await requireAdminSession();
  }catch{
    return Response.json(
      {
        success:false,
        message:"Unauthorized"
      },
      {
        status:401
      }
    );
  }



  const {id}=await req.json();

  deleteCampaign(id);

  return NextResponse.json({success:true});

}
