import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth/session";
import { addAudit } from "@/lib/audit/store";

export async function POST() {

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



  const session = await getSession();

  if (session) {
    addAudit(
      "Authentication",
      "LOGOUT",
      "SUCCESS",
      {
        username: session.username
      }
    );
  }

  await destroySession();

  return NextResponse.json({
    success: true
  });

}
