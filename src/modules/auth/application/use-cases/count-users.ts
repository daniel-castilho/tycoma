import type { UserRepository } from "../../domain/user";

export function createCountUsers(users: UserRepository) {
  return async function countUsers(): Promise<number> {
    return users.count();
  };
}
