import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET =
process.env.ADMIN_SESSION_SECRET ||
"CHANGE_THIS_IN_PRODUCTION";

const COOKIE_NAME="deals_admin_session";

function unauthorized(request:NextRequest){

if(request.nextUrl.pathname.startsWith("/api/")){

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

const loginUrl=new URL("/admin/login",request.url);

loginUrl.searchParams.set(
"next",
request.nextUrl.pathname
);

return NextResponse.redirect(loginUrl);

}

export function proxy(request:NextRequest){

const {pathname}=request.nextUrl;

if(
pathname==="/admin/login" ||
pathname==="/api/admin/login" ||
pathname==="/api/admin/session" ||
pathname.startsWith("/_next") ||
pathname.startsWith("/favicon")
){

return NextResponse.next();

}

const protectedPage=pathname.startsWith("/admin");

const protectedApi=pathname.startsWith("/api/admin");

if(!protectedPage && !protectedApi){

return NextResponse.next();

}

const token=request.cookies.get(COOKIE_NAME)?.value;

if(!token){

return unauthorized(request);

}

try{

jwt.verify(token,SECRET);

return NextResponse.next();

}catch{

return unauthorized(request);

}

}

export const config={

matcher:[
"/admin/:path*",
"/api/admin/:path*"
]

};
