import { env } from "@/shared/env-instance";
import type { Mailer } from "../domain/mailer";

export const consoleMailer: Mailer = {
  async sendPasswordReset(to, { appUrl }) {
    if (env.NODE_ENV === "production") {
      // Never silently "send" mail in production — the reset flow reports
      // success to the caller, so a no-op delivery would lie to the admin.
      throw new Error(
        "No real mailer configured in production. Set MAILER/SMTP configuration before using password reset.",
      );
    }
    const resetPage = `${appUrl.replace(/\/$/, "")}/admin/reset-password`;
    console.info(`[mailer] Password reset for ${to}: ${resetPage} (token omitted from logs)`);
  },
};