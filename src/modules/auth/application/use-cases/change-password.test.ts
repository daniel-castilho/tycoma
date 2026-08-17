import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "@/modules/audit/domain/types.ts";
import type { PasswordHasher } from "../../domain/password-hasher.ts";
import type { RateLimiter } from "../../domain/rate-limiter.ts";
import type { StepUpStore } from "../../domain/step-up.ts";
import type { User, UserRepository } from "../../domain/user.ts";
import {
  CHANGE_PASSWORD_RATE_LIMIT,
  CHANGE_PASSWORD_RATE_WINDOW_SECONDS,
} from "../../domain/policies";
import { createChangePassword } from "./change-password.ts";

const baseUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  email: "admin@example.test",
  name: "Admin",
  passwordHash: "hashed:current-password",
  avatarMediaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function memoryUsers(seed: User[]): UserRepository {
  const rows = [...seed];
  return {
    async findById(id) {
      return rows.find((u) => u.id === id) ?? null;
    },
    async findByEmail(email) {
      return rows.find((u) => u.email === email) ?? null;
    },
    async create(data) {
      const user: User = {
        id: `user-${rows.length + 1}`,
        ...data,
        avatarMediaId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(user);
      return user;
    },
    async update(id, data) {
      const idx = rows.findIndex((u) => u.id === id);
      if (idx < 0) throw new Error("missing");
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async count() {
      return rows.length;
    },
  };
}

function memoryAudit(): { events: AuditEventWrite[]; writer: AuditEventWriter } {
  const events: AuditEventWrite[] = [];
  return {
    events,
    writer: {
      async record(event) {
        events.push(event);
      },
    },
  };
}

function memoryLimiter(): { calls: Array<{ key: string; limit: number; window: number }>; limiter: RateLimiter } {
  const calls: Array<{ key: string; limit: number; window: number }> = [];
  return {
    calls,
    limiter: {
      async hit(key, limit, window) {
        calls.push({ key, limit, window });
        return { allowed: true, remaining: limit - 1 };
      },
    },
  };
}

function fixedHasher(ok: boolean): PasswordHasher & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async hash(_password) {
      return "hashed:new";
    },
    async verify(password, hash) {
      calls.push(password);
      return ok && hash === `hashed:${password}`;
    },
  };
}

function memoryStepUp(active: boolean): StepUpStore {
  return {
    async grant() {},
    async has() {
      return active;
    },
    async revoke() {},
  };
}

describe("createChangePassword (rate limit + step-up + happy path)", () => {
  it("rejects when the rate limiter denies", async () => {
    const limiter: RateLimiter = {
      async hit() {
        return { allowed: false, remaining: 0 };
      },
    };
    const hasher = fixedHasher(true);
    const { writer, events } = memoryAudit();
    const changePassword = createChangePassword(
      memoryUsers([baseUser()]),
      writer,
      hasher,
      limiter,
      memoryStepUp(true),
    );
    const result = await changePassword({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-12345",
      confirmPassword: "new-password-12345",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Too many/);
    assert.equal(events.length, 0);
  });

  it("rejects when the step-up marker is missing", async () => {
    const { limiter } = memoryLimiter();
    const hasher = fixedHasher(true);
    const { writer, events } = memoryAudit();
    const changePassword = createChangePassword(
      memoryUsers([baseUser()]),
      writer,
      hasher,
      limiter,
      memoryStepUp(false),
    );
    const result = await changePassword({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-12345",
      confirmPassword: "new-password-12345",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /confirm/i);
    assert.equal(events.length, 0);
  });

  it("accepts and persists a new password when rate limit allows, step-up is present, and current matches", async () => {
    const { limiter } = memoryLimiter();
    const hasher = fixedHasher(true);
    const users = memoryUsers([baseUser()]);
    const { writer, events } = memoryAudit();
    const changePassword = createChangePassword(
      users,
      writer,
      hasher,
      limiter,
      memoryStepUp(true),
    );
    const result = await changePassword({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-12345",
      confirmPassword: "new-password-12345",
    });
    assert.equal(result.ok, true);
    const stored = await users.findById("user-1");
    assert.equal(stored?.passwordHash, "hashed:new");
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "auth.password_changed");
  });

  it("rejects when the current password does not match", async () => {
    const { limiter } = memoryLimiter();
    const hasher = fixedHasher(false);
    const { writer, events } = memoryAudit();
    const changePassword = createChangePassword(
      memoryUsers([baseUser()]),
      writer,
      hasher,
      limiter,
      memoryStepUp(true),
    );
    const result = await changePassword({
      userId: "user-1",
      currentPassword: "wrong",
      newPassword: "new-password-12345",
      confirmPassword: "new-password-12345",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /incorrect/i);
    assert.equal(events.length, 0);
  });

  it("rejects when the new password and confirmation do not match", async () => {
    const { limiter } = memoryLimiter();
    const hasher = fixedHasher(true);
    const users = memoryUsers([baseUser()]);
    const { writer, events } = memoryAudit();
    const changePassword = createChangePassword(
      users,
      writer,
      hasher,
      limiter,
      memoryStepUp(true),
    );
    const result = await changePassword({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-12345",
      confirmPassword: "different-password",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /do not match/i);
    const stored = await users.findById("user-1");
    assert.equal(stored?.passwordHash, "hashed:current-password");
    assert.equal(events.length, 0);
  });

  it("uses the documented rate limit budget", () => {
    assert.equal(CHANGE_PASSWORD_RATE_LIMIT, 5);
    assert.equal(CHANGE_PASSWORD_RATE_WINDOW_SECONDS, 60 * 15);
  });
});
