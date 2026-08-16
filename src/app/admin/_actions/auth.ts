"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { appUrl, clientIp, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../_lib/session-cookie";

export type AuthActionState = { error: string | null; message: string | null };

const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const setupSchema = z.object({
  name: z.string().trim().min(1, "A name is required."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const emailSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function invalidInput(): AuthActionState {
  return { error: "Check the form fields and try again.", message: null };
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

export async function setupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const existing = await auth.countUsers();
  if (existing > 0) {
    redirect("/admin/login");
  }

  const parsed = setupSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return invalidInput();
  }
  const created = await auth.createFirstAdmin(parsed.data);
  if (!created.ok) {
    return { error: created.error, message: null };
  }

  const hdrs = await headers();
  const session = await auth.login({
    email: parsed.data.email,
    password: parsed.data.password,
    ip: clientIp(hdrs),
  });
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
  const users = await auth.countUsers();
  if (users === 0) {
    redirect("/admin/setup");
  }

  const parsed = credentialsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return invalidInput();
  }
  const hdrs = await headers();
  const result = await auth.login({
    email: parsed.data.email,
    password: parsed.data.password,
    ip: clientIp(hdrs),
  });
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
  const parsed = emailSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return invalidInput();
  }
  const hdrs = await headers();
  const result = await auth.requestPasswordReset({
    email: parsed.data.email,
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
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return invalidInput();
  }
  const result = await auth.resetPassword(parsed.data);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  return { error: null, message: "Password updated. You can sign in now." };
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}