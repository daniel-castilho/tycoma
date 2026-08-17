import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { PasswordHasher } from "../../domain/password-hasher";
import { CHANGE_PASSWORD_RATE_LIMIT, CHANGE_PASSWORD_RATE_WINDOW_SECONDS, MIN_PASSWORD_LENGTH } from "../../domain/policies";
import type { RateLimiter } from "../../domain/rate-limiter";
import type { StepUpStore } from "../../domain/step-up";
import type { UserReader, UserWriter } from "../../domain/user";

export function createChangePassword(
  users: UserReader & UserWriter,
  audit: AuditEventWriter,
  hasher: PasswordHasher,
  limiter: RateLimiter,
  stepUp: StepUpStore,
) {
  return async function changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<Result<{ ok: true }>> {
    const rateKey = `change_password:${input.userId}`;
    const decision = await limiter.hit(
      rateKey,
      CHANGE_PASSWORD_RATE_LIMIT,
      CHANGE_PASSWORD_RATE_WINDOW_SECONDS,
    );
    if (!decision.allowed) {
      return err("Too many change-password attempts. Try again in a few minutes.");
    }

    if (input.newPassword !== input.confirmPassword) {
      return err("New passwords do not match.");
    }

    // Phase B: require a fresh step-up marker (granted by createStepUp after
    // the admin re-enters the current password). The marker is valid for
    // STEP_UP_TTL_SECONDS and is reused (not consumed) — better UX for retries.
    const stepUpOk = await stepUp.has(input.userId);
    if (!stepUpOk) {
      return err("Please confirm your current password before changing it.");
    }

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
