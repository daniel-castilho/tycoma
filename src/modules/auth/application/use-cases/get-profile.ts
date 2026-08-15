import { err, ok, type Result } from "@/shared/kernel/result";
import type { UserRepository } from "../../domain/user";

export function createGetProfile(users: UserRepository) {
  return async function getProfile(userId: string): Promise<
    Result<{ id: string; email: string; name: string; avatarMediaId: string | null }>
  > {
    const user = await users.findById(userId);
    if (!user) {
      return err("User not found.");
    }
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarMediaId: user.avatarMediaId,
    });
  };
}
