import { env } from "@/shared/env-instance";
import { SESSION_TTL_SECONDS } from "@/modules/auth/domain/policies";

export const SESSION_COOKIE = "tycoma_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

export function appUrl(): string {
  return env.APP_URL;
}
