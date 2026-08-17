import type { Mailer } from "../domain/mailer";

export const consoleMailer: Mailer = {
  async sendPasswordReset(to, { appUrl }) {
    const resetPage = `${appUrl.replace(/\/$/, "")}/admin/reset-password`;
    console.info(`[mailer] Password reset for ${to}: ${resetPage} (token omitted from logs)`);
  },
};