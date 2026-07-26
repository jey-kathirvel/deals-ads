import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { history } from "@/lib/jobs/job-history";

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


  return NextResponse.json(history());
}
