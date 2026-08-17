import type { UserReader } from "../../domain/user";

export function createCountUsers(users: UserReader) {
  return async function countUsers(): Promise<number> {
    return users.count();
  };
}
