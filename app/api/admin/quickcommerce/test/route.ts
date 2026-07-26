import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { testConnection } from "@/lib/quickcommerce/admin";

export async function POST(){

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
    await testConnection()
  );

}
