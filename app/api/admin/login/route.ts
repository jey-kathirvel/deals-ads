import { NextResponse } from "next/server";
import { findAdminUser, updateLastLogin } from "@/lib/auth/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { addAudit } from "@/lib/audit/store";

export async function POST(req:Request){

const body=await req.json();

const username=(body.username||"").trim();

const password=body.password||"";

const user=findAdminUser(username);

if(!user){

addAudit(
"Authentication",
"LOGIN_FAILED",
"FAILED",
{username}
);

return NextResponse.json(
{
success:false,
message:"Invalid username or password."
},
{
status:401
}
);

}

const valid=await verifyPassword(
password,
user.passwordHash
);

if(!valid){

addAudit(
"Authentication",
"LOGIN_FAILED",
"FAILED",
{username}
);

return NextResponse.json(
{
success:false,
message:"Invalid username or password."
},
{
status:401
}
);

}

await createSession({

id:user.id,

username:user.username,

fullName:user.fullName,

role:user.role

});

updateLastLogin(user.id);

addAudit(
"Authentication",
"LOGIN_SUCCESS",
"SUCCESS",
{
username:user.username
}
);

return NextResponse.json({

success:true,

user:{
username:user.username,
fullName:user.fullName,
role:user.role
}

});

}
