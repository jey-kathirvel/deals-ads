import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { operationsDashboard } from "@/lib/operations/dashboard";

export async function GET() {

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


  return NextResponse.json(operationsDashboard());
}
