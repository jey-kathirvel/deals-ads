import { getSession } from "./session";

export async function requireAdminSession() {

  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;

}
