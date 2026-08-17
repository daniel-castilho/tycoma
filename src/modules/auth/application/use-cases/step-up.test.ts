import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STEP_UP_TTL_SECONDS } from "../../domain/policies.ts";
import type { PasswordHasher } from "../../domain/password-hasher.ts";
import type { StepUpStore } from "../../domain/step-up.ts";
import type { User, UserRepository } from "../../domain/user.ts";
import { createStepUp } from "./step-up.ts";

const baseUser: User = {
  id: "user-1",
  email: "admin@example.test",
  name: "Admin",
  passwordHash: "hashed:current-password",
  avatarMediaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function memoryUsers(user: User | null = baseUser): UserRepository {
  return {
    async findById(id) {
      return user && user.id === id ? user : null;
    },
    async findByEmail(email) {
      return user && user.email === email ? user : null;
    },
    async create() {
      throw new Error("not used");
    },
    async update() {
      throw new Error("not used");
    },
    async count() {
      return user ? 1 : 0;
    },
  };
}

function fixedHasher(ok: boolean): PasswordHasher {
  return {
    async hash() {
      return "hashed";
    },
    async verify(password, hash) {
      return ok && hash === `hashed:${password}`;
    },
  };
}

function memoryStore(): { grants: Array<{ userId: string; ttl: number }>; store: StepUpStore } {
  const grants: Array<{ userId: string; ttl: number }> = [];
  return {
    grants,
    store: {
      async grant(userId, ttlSeconds) {
        grants.push({ userId, ttl: ttlSeconds });
      },
      async has() {
        return true;
      },
      async revoke() {},
    },
  };
}

describe("createStepUp", () => {
  it("grants a step-up marker when the current password matches", async () => {
    const { grants, store } = memoryStore();
    const stepUp = createStepUp(memoryUsers(), fixedHasher(true), store);
    const result = await stepUp({ userId: "user-1", currentPassword: "current-password" });
    assert.equal(result.ok, true);
    assert.equal(grants.length, 1);
    assert.equal(grants[0]!.userId, "user-1");
    assert.equal(grants[0]!.ttl, STEP_UP_TTL_SECONDS);
  });

  it("rejects without revealing account existence when the user is missing", async () => {
    const { grants, store } = memoryStore();
    const stepUp = createStepUp(memoryUsers(null), fixedHasher(true), store);
    const result = await stepUp({ userId: "user-1", currentPassword: "current-password" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /incorrect/i);
    assert.equal(grants.length, 0);
  });

  it("rejects when the current password does not match", async () => {
    const { grants, store } = memoryStore();
    const stepUp = createStepUp(memoryUsers(), fixedHasher(false), store);
    const result = await stepUp({ userId: "user-1", currentPassword: "wrong" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /incorrect/i);
    assert.equal(grants.length, 0);
  });

  it("uses a 10-minute TTL by default", () => {
    assert.equal(STEP_UP_TTL_SECONDS, 60 * 10);
  });
});
