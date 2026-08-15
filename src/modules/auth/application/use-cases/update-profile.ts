import { err, ok, type Result } from "@/shared/kernel/result";
import type { UserRepository } from "../../domain/user";

export function createUpdateProfile(users: UserRepository) {
  return async function updateProfile(input: {
    userId: string;
    name: string;
    email: string;
    avatarMediaId: string | null;
  }): Promise<Result<{ ok: true }>> {
    const email = input.email.trim().toLowerCase();
    const other = await users.findByEmail(email);
    if (other && other.id !== input.userId) {
      return err("Email is already in use.");
    }
    await users.update(input.userId, {
      name: input.name.trim(),
      email,
      avatarMediaId: input.avatarMediaId,
    });
    return ok({ ok: true });
  };
}
