import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { PasswordHasher } from "../../domain/password-hasher";
import { MIN_PASSWORD_LENGTH } from "../../domain/policies";
import type { UserRepository } from "../../domain/user";

export function createCreateFirstAdmin(
  users: UserRepository,
  audit: AuditEventWriter,
  hasher: PasswordHasher,
) {
  return async function createFirstAdmin(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<Result<{ id: string }>> {
    const existing = await users.count();
    if (existing > 0) {
      return err("Admin account already exists.");
    }
    const name = input.name.trim();
    if (!name) {
      return err("A name is required.");
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) {
      return err("A valid email is required.");
    }
    const passwordHash = await hasher.hash(input.password);
    const user = await users.create({
      email,
      name,
      passwordHash,
    });
    await audit.record({
      actorId: user.id,
      eventType: "auth.setup",
      entityType: "user",
      entityId: user.id,
      details: JSON.stringify({ email }),
    });
    return ok({ id: user.id });
  };
}
