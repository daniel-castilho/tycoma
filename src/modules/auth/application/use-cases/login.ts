import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { PasswordHasher } from "../../domain/password-hasher";
import type { LockoutStore } from "../../domain/lockout";
import { LOGIN_RATE_LIMIT } from "../../domain/policies";
import type { RateLimiter } from "../../domain/rate-limiter";
import type { SessionIssuer } from "../../domain/session";
import type { UserReader } from "../../domain/user";
import {
  LOCKOUT_BLOCK_SECONDS,
  LOCKOUT_FAILURE_THRESHOLD,
  LOCKOUT_FAILURE_WINDOW_SECONDS,
} from "./lockout-policy";

export function createLogin(
  users: UserReader,
  sessions: SessionIssuer,
  limiter: RateLimiter,
  audit: AuditEventWriter,
  hasher: PasswordHasher,
  lockout: LockoutStore,
) {
  return async function login(input: {
    email: string;
    password: string;
    ip: string;
  }): Promise<Result<{ token: string }>> {
    const email = input.email.trim().toLowerCase();
    const lockKey = `${input.ip}:${email}`;

    // Phase B: extended block check first (cheap O(1) Redis EXISTS).
    const alreadyBlocked = await lockout.isBlocked(lockKey);
    if (alreadyBlocked) {
      await audit.record({
        actorId: null,
        eventType: "auth.login_blocked",
        entityType: "user",
        entityId: null,
        details: JSON.stringify({ email, ip: input.ip, reason: "progressive_lockout" }),
      });
      return err("Too many login attempts. Try again later.");
    }

    const limit = await limiter.hit(
      `login:${input.ip}:${email}`,
      LOGIN_RATE_LIMIT.max,
      LOGIN_RATE_LIMIT.windowSeconds,
    );
    if (!limit.allowed) {
      await audit.record({
        actorId: null,
        eventType: "auth.login_blocked",
        entityType: "user",
        entityId: null,
        details: JSON.stringify({ email, ip: input.ip }),
      });
      return err("Too many login attempts. Try again later.");
    }

    const user = await users.findByEmail(email);
    if (!user) {
      const failures = await lockout.countFailure(lockKey, LOCKOUT_FAILURE_WINDOW_SECONDS);
      if (failures >= LOCKOUT_FAILURE_THRESHOLD) {
        await lockout.block(lockKey, LOCKOUT_BLOCK_SECONDS);
      }
      await audit.record({
        actorId: null,
        eventType: "auth.login_failed",
        entityType: "user",
        entityId: null,
        details: JSON.stringify({ email, ip: input.ip, reason: "unknown_user", failures }),
      });
      return err("Invalid email or password.");
    }
    const match = await hasher.verify(input.password, user.passwordHash);
    if (!match) {
      const failures = await lockout.countFailure(lockKey, LOCKOUT_FAILURE_WINDOW_SECONDS);
      const extended = failures >= LOCKOUT_FAILURE_THRESHOLD;
      if (extended) {
        await lockout.block(lockKey, LOCKOUT_BLOCK_SECONDS);
      }
      await audit.record({
        actorId: null,
        eventType: "auth.login_failed",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({
          email,
          ip: input.ip,
          reason: "bad_password",
          failures,
          extended_block: extended,
        }),
      });
      return err("Invalid email or password.");
    }

    // Successful login clears any partial lockout state.
    await lockout.reset(lockKey);

    const token = await sessions.issue({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
    await audit.record({
      actorId: user.id,
      eventType: "auth.login",
      entityType: "user",
      entityId: user.id,
      details: JSON.stringify({ email, ip: input.ip }),
    });
    return ok({ token });
  };
}
