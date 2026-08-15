import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { PasswordHasher } from "../../domain/password-hasher";
import { MIN_PASSWORD_LENGTH } from "../../domain/policies";
import type { UserRepository } from "../../domain/user";

export function createChangePassword(
  users: UserRepository,
  audit: AuditEventWriter,
  hasher: PasswordHasher,
) {
  return async function changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<Result<{ ok: true }>> {
    const user = await users.findById(input.userId);
    if (!user) {
      return err("User not found.");
    }
    const match = await hasher.verify(input.currentPassword, user.passwordHash);
    if (!match) {
      return err("Current password is incorrect.");
    }
    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    const passwordHash = await hasher.hash(input.newPassword);
    await users.update(input.userId, { passwordHash });
    await audit.record({
      actorId: input.userId,
      eventType: "auth.password_changed",
      entityType: "user",
      entityId: input.userId,
      details: null,
    });
    return ok({ ok: true });
  };
}
