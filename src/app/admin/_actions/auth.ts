"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  countUsers,
  createFirstAdmin,
  login,
  requestPasswordReset,
  resetPassword,
} from "@/modules/auth/application";
import { appUrl, clientIp, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../_lib/session-cookie";

export type AuthActionState = { error: string | null; message: string | null };

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const existing = await countUsers();
  if (existing > 0) {
    redirect("/admin/login");
  }

  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const created = await createFirstAdmin({ name, email, password });
  if (!created.ok) {
    return { error: created.error, message: null };
  }

  const hdrs = await headers();
  const session = await login({ email, password, ip: clientIp(hdrs) });
  if (!session.ok) {
    return { error: null, message: "Account created. Sign in to continue." };
  }
  await setSessionCookie(session.value.token);
  redirect("/admin");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const users = await countUsers();
  if (users === 0) {
    redirect("/admin/setup");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const hdrs = await headers();
  const result = await login({ email, password, ip: clientIp(hdrs) });
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  await setSessionCookie(result.value.token);
  redirect("/admin");
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const hdrs = await headers();
  const result = await requestPasswordReset({
    email,
    ip: clientIp(hdrs),
    appUrl: appUrl(),
  });
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  return {
    error: null,
    message: "If that email exists, a reset link has been sent.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await resetPassword({ token, password });
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  return { error: null, message: "Password updated. You can sign in now." };
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}
