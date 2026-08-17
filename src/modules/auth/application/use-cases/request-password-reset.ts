import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { Mailer } from "../../domain/mailer";
import type { PasswordResetTokenRepository } from "../../domain/password-reset-token";
import {
  PASSWORD_RESET_RATE_LIMIT,
  PASSWORD_RESET_TTL_MS,
} from "../../domain/policies";
import type { RateLimiter } from "../../domain/rate-limiter";
import type { TokenHasher } from "../../domain/token-hasher";
import type { UserReader } from "../../domain/user";

export function createRequestPasswordReset(
  users: UserReader,
  tokens: PasswordResetTokenRepository,
  tokenHasher: TokenHasher,
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
    const limit = await limiter.hit(
      `reset:${input.ip}:${email}`,
      PASSWORD_RESET_RATE_LIMIT.max,
      PASSWORD_RESET_RATE_LIMIT.windowSeconds,
    );
    if (!limit.allowed) {
      return err("Too many reset requests. Try again later.");
    }
    const user = await users.findByEmail(email);
    // Always succeed to avoid account enumeration.
    if (!user) {
      return ok({ sent: true });
    }
    const raw = await tokenHasher.generateRaw();
    const tokenHash = await tokenHasher.hash(raw);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await tokens.create({ userId: user.id, tokenHash, expiresAt });
    await mailer.sendPasswordReset(user.email, { appUrl: input.appUrl, token: raw });
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
