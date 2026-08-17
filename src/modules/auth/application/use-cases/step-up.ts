import { err, ok, type Result } from "@/shared/kernel/result";
import { STEP_UP_TTL_SECONDS } from "../../domain/policies";
import type { PasswordHasher } from "../../domain/password-hasher";
import type { StepUpStore } from "../../domain/step-up";
import type { UserReader } from "../../domain/user";

export function createStepUp(users: UserReader, hasher: PasswordHasher, store: StepUpStore) {
  return async function stepUp(input: {
    userId: string;
    currentPassword: string;
  }): Promise<Result<{ ok: true }>> {
    const user = await users.findById(input.userId);
    if (!user) {
      // Same generic error as login — don't reveal account existence.
      return err("Current password is incorrect.");
    }
    const match = await hasher.verify(input.currentPassword, user.passwordHash);
    if (!match) {
      return err("Current password is incorrect.");
    }
    await store.grant(input.userId, STEP_UP_TTL_SECONDS);
    return ok({ ok: true });
  };
}
