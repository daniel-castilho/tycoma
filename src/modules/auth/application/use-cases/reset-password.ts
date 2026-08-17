import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { PasswordHasher } from "../../domain/password-hasher";
import { MIN_PASSWORD_LENGTH } from "../../domain/policies";
import type { PasswordResetTokenRepository } from "../../domain/password-reset-token";
import type { TokenHasher } from "../../domain/token-hasher";
import type { UserWriter } from "../../domain/user";

export function createResetPassword(
  users: UserWriter,
  tokens: PasswordResetTokenRepository,
  tokenHasher: TokenHasher,
  audit: AuditEventWriter,
  hasher: PasswordHasher,
) {
  return async function resetPassword(input: {
    token: string;
    password: string;
  }): Promise<Result<{ ok: true }>> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    const tokenHash = await tokenHasher.hash(input.token);
    const record = await tokens.findValidByHash(tokenHash, new Date());
    if (!record) {
      return err("This reset link is invalid or has expired.");
    }
    const passwordHash = await hasher.hash(input.password);
    await users.update(record.userId, { passwordHash });
    await tokens.markUsed(record.id, new Date());
    await audit.record({
      actorId: record.userId,
      eventType: "auth.password_reset_completed",
      entityType: "user",
      entityId: record.userId,
      details: null,
    });
    return ok({ ok: true });
  };
}
