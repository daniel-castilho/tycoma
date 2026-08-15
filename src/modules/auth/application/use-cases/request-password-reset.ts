import { createHash, randomBytes } from "node:crypto";
import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { Mailer } from "../../domain/mailer";
import type { PasswordResetTokenRepository } from "../../domain/password-reset-token";
import type { RateLimiter } from "../../domain/rate-limiter";
import type { UserRepository } from "../../domain/user";

export function createRequestPasswordReset(
  users: UserRepository,
  tokens: PasswordResetTokenRepository,
  mailer: Mailer,
  limiter: RateLimiter,
  audit: AuditEventWriter,
) {
  return async function requestPasswordReset(input: {
    email: string;
    ip: string;
    appUrl: string;
  }): Promise<Result<{ sent: true }>> {
    const email = input.email.trim().toLowerCase();
    const limit = await limiter.hit(`reset:${input.ip}:${email}`, 5, 15 * 60);
    if (!limit.allowed) {
      return err("Too many reset requests. Try again later.");
    }
    const user = await users.findByEmail(email);
    // Always succeed to avoid account enumeration.
    if (!user) {
      return ok({ sent: true });
    }
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await tokens.create({ userId: user.id, tokenHash, expiresAt });
    const resetUrl = `${input.appUrl.replace(/\/$/, "")}/admin/reset-password?token=${raw}`;
    await mailer.sendPasswordReset(user.email, resetUrl);
    await audit.record({
      actorId: user.id,
      eventType: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      details: JSON.stringify({ ip: input.ip }),
    });
    return ok({ sent: true });
  };
}
