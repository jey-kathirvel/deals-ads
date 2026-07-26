import { requireAdminSession } from "@/lib/auth/guard";
import {NextResponse} from "next/server";
import {
listDeals,
saveDeal,
deleteDeal
} from "@/lib/manual-deals/store";

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


  return NextResponse.json(listDeals());
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


  return NextResponse.json(
    saveDeal(await req.json())
  );
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

  deleteDeal(id);

  return NextResponse.json({
    success:true
  });

}
