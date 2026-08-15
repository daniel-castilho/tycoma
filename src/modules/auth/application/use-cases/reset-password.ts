import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { err, ok, type Result } from "@/shared/kernel/result";
import type { PasswordResetTokenRepository } from "../../domain/password-reset-token";
import type { UserRepository } from "../../domain/user";

export function createResetPassword(
  users: UserRepository,
  tokens: PasswordResetTokenRepository,
) {
  return async function resetPassword(input: {
    token: string;
    password: string;
  }): Promise<Result<{ ok: true }>> {
    if (input.password.length < 8) {
      return err("Password must be at least 8 characters.");
    }
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const record = await tokens.findValidByHash(tokenHash, new Date());
    if (!record) {
      return err("This reset link is invalid or has expired.");
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    await users.update(record.userId, { passwordHash });
    await tokens.markUsed(record.id, new Date());
    return ok({ ok: true });
  };
}
