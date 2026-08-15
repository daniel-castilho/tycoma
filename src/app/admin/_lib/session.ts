import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/modules/auth/application/edge";
import { SESSION_COOKIE } from "./session-cookie";

export async function currentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireSession() {
  const session = await currentSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}