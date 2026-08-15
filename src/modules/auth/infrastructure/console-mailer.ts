import type { Mailer } from "../domain/mailer";

export const consoleMailer: Mailer = {
  async sendPasswordReset(to, resetUrl) {
    console.info(`[mailer] Password reset for ${to}: ${resetUrl}`);
  },
};
