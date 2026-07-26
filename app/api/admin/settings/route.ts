import { requireAdminSession } from "@/lib/auth/guard";
import {NextResponse} from "next/server";
import {getSettings,saveSettings} from "@/lib/settings/store";

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


  return NextResponse.json(getSettings());
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


  return NextResponse.json(
    saveSettings(await req.json())
  );
}
