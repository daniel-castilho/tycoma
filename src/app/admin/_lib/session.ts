import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createEdgeAuthApplication } from "@/modules/auth/application/edge";
import { jwtSessionVerifier } from "@/modules/auth/infrastructure/jwt-session-verifier";
import { SESSION_COOKIE } from "./session-cookie";

const { verifySessionToken } = createEdgeAuthApplication({ verifier: jwtSessionVerifier });

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