import bcrypt from "bcryptjs";
import { err, ok, type Result } from "@/shared/kernel/result";
import type { UserRepository } from "../../domain/user";

export function createChangePassword(users: UserRepository) {
  return async function changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<Result<{ ok: true }>> {
    const user = await users.findById(input.userId);
    if (!user) {
      return err("User not found.");
    }
    const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!match) {
      return err("Current password is incorrect.");
    }
    if (input.newPassword.length < 8) {
      return err("Password must be at least 8 characters.");
    }
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await users.update(input.userId, { passwordHash });
    return ok({ ok: true });
  };
}
