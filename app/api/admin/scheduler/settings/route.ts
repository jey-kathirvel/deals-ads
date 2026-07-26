import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import {
  getSchedulerSettings,
  saveSchedulerSettings
} from "@/lib/scheduler/settings";

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


  return NextResponse.json(getSchedulerSettings());
}

export async function PUT(req:Request){

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



  const body=await req.json();

  saveSchedulerSettings(body);

  return NextResponse.json({
    success:true
  });

}
