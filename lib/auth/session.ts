import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { SessionUser } from "./types";

const COOKIE_NAME="deals_admin_session";

const SECRET=
process.env.ADMIN_SESSION_SECRET ||
"CHANGE_THIS_IN_PRODUCTION";

const SESSION_TIMEOUT_MINUTES=Number(
process.env.ADMIN_SESSION_TIMEOUT_MINUTES || 480
);

const EXPIRES_IN=SESSION_TIMEOUT_MINUTES*60;

export async function createSession(user:SessionUser){

const token=jwt.sign(user,SECRET,{
expiresIn:EXPIRES_IN
});

const store=await cookies();

store.set(COOKIE_NAME,token,{
httpOnly:true,
secure:process.env.NODE_ENV==="production",
sameSite:"lax",
path:"/",
maxAge:SESSION_TIMEOUT_MINUTES*60
});

}

export async function destroySession(){

const store=await cookies();

store.delete(COOKIE_NAME);

}

export async function getSession():Promise<SessionUser|null>{

const store=await cookies();

const token=store.get(COOKIE_NAME)?.value;

if(!token) return null;

try{

return jwt.verify(token,SECRET) as SessionUser;

}catch{

return null;

}

}

export const SESSION_COOKIE_NAME=COOKIE_NAME;
