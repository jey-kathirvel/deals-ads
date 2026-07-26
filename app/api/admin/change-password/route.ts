import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdminSession } from "@/lib/auth/guard";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { addAudit } from "@/lib/audit/store";

const FILE=path.join(process.cwd(),"data/admin-users.json");

export async function POST(req:Request){

try{

const session=await requireAdminSession();

const body=await req.json();

const currentPassword=body.currentPassword||"";

const newPassword=body.newPassword||"";

if(newPassword.length<8){

return NextResponse.json(
{
success:false,
message:"Password must contain at least 8 characters."
},
{
status:400
}
);

}

const users=JSON.parse(
fs.readFileSync(FILE,"utf8")
);

const idx=users.findIndex(
(x:any)=>x.id===session.id
);

if(idx<0){

return NextResponse.json(
{
success:false,
message:"User not found."
},
{
status:404
}
);

}

const ok=await verifyPassword(
currentPassword,
users[idx].passwordHash
);

if(!ok){

addAudit(
"Authentication",
"CHANGE_PASSWORD_FAILED",
"FAILED",
{
username:session.username
}
);

return NextResponse.json(
{
success:false,
message:"Current password is incorrect."
},
{
status:401
}
);

}

users[idx].passwordHash=await hashPassword(newPassword);

fs.writeFileSync(
FILE,
JSON.stringify(users,null,2)
);

addAudit(
"Authentication",
"CHANGE_PASSWORD",
"SUCCESS",
{
username:session.username
}
);

return NextResponse.json({
success:true
});

}catch{

return NextResponse.json(
{
success:false,
message:"Unauthorized"
},
{
status:401
}
);

}

}
