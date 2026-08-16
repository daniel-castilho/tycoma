import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWriter } from "../../../audit/domain/types.ts";
import type { LockoutStore } from "../../domain/lockout.ts";
import type { PasswordHasher } from "../../domain/password-hasher.ts";
import type { SessionIssuer } from "../../domain/session.ts";
import type { User, UserRepository } from "../../domain/user.ts";
import { createLogin } from "./login.ts";
import {
  LOCKOUT_BLOCK_SECONDS,
  LOCKOUT_FAILURE_THRESHOLD,
  LOCKOUT_FAILURE_WINDOW_SECONDS,
} from "./lockout-policy.ts";

const noopAudit = { record: async () => {} };

function memoryLockout(): LockoutStore & { failures: string[]; blocks: string[]; resets: string[]; blockedKeys: Set<string> } {
  const failures: string[] = [];
  const blocks: string[] = [];
  const resets: string[] = [];
  const blockedKeys = new Set<string>();
  const counters = new Map<string, number>();
  return {
    failures,
    blocks,
    resets,
    blockedKeys,
    async countFailure(key, _windowSeconds) {
      failures.push(key);
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return n;
    },
    async isBlocked(key) {
      return blockedKeys.has(key);
    },
    async block(key, _blockSeconds) {
      blocks.push(key);
      blockedKeys.add(key);
    },
    async reset(key) {
      resets.push(key);
      counters.delete(key);
      blockedKeys.delete(key);
    },
  };
}

const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async verify(password, hash) {
    return hash === `hashed:${password}`;
  },
};

const fakeIssuer: SessionIssuer = {
  async issue(payload) {
    return `token:${payload.sub}`;
  },
  async verify() {
    return null;
  },
};

function memoryUsers(seed: User[] = []): UserRepository {
  const rows = [...seed];
  return {
    async count() {
      return rows.length;
    },
    async findById(id) {
      return rows.find((u) => u.id === id) ?? null;
    },
    async findByEmail(email) {
      return rows.find((u) => u.email === email) ?? null;
    },
    async create(data) {
      const user: User = {
        id: String(rows.length + 1),
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
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
      rows[idx] = { ...rows[idx]!, ...data, updatedAt: new Date() };
      return rows[idx]!;
    },
  };
}

function memoryLimiter(initial: { allowed: boolean; remaining: number } = { allowed: true, remaining: 7 }) {
  let state = initial;
  return {
    async hit(): Promise<{ allowed: boolean; remaining: number }> {
      return state;
    },
    block() {
      state = { allowed: false, remaining: 0 };
    },
  };
}

function seedUser(email = "ada@example.com", password = "longenough"): User {
  return {
    id: "u1",
    email,
    name: "Ada",
    passwordHash: `hashed:${password}`,
    avatarMediaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("login", () => {
  it("returns a session token on valid credentials and audits the login", async () => {
    const users = memoryUsers([seedUser()]);
    const events: unknown[] = [];
    const audit: AuditEventWriter = {
      record: async (e) => {
        events.push(e);
      },
    };
    const login = createLogin(users, fakeIssuer, memoryLimiter(), audit, fakeHasher, memoryLockout());
    const result = await login({ email: "Ada@Example.com", password: "longenough", ip: "1.2.3.4" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.token, "token:u1");
    assert.ok(events.some((e) => (e as { eventType: string }).eventType === "auth.login"));
  });

  it("rejects an unknown user without leaking whether the account exists", async () => {
    const lockout = memoryLockout();
    const login = createLogin(memoryUsers(), fakeIssuer, memoryLimiter(), noopAudit, fakeHasher, lockout);
    const result = await login({ email: "nobody@example.com", password: "longenough", ip: "1.2.3.4" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "Invalid email or password.");
    assert.equal(lockout.failures.length, 1);
    assert.equal(lockout.blocks.length, 0);
  });

  it("rejects a wrong password", async () => {
    const login = createLogin(memoryUsers([seedUser()]), fakeIssuer, memoryLimiter(), noopAudit, fakeHasher, memoryLockout());
    const result = await login({ email: "ada@example.com", password: "wrong", ip: "1.2.3.4" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "Invalid email or password.");
  });

  it("blocks when the rate limiter denies and audits the block", async () => {
    const users = memoryUsers([seedUser()]);
    const events: unknown[] = [];
    const audit: AuditEventWriter = {
      record: async (e) => {
        events.push(e);
      },
    };
    const limiter = memoryLimiter();
    limiter.block();
    const login = createLogin(users, fakeIssuer, limiter, audit, fakeHasher, memoryLockout());
    const result = await login({ email: "ada@example.com", password: "longenough", ip: "1.2.3.4" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Too many login attempts/i);
    assert.ok(events.some((e) => (e as { eventType: string }).eventType === "auth.login_blocked"));
  });

  it("extends the lockout once failures reach the threshold", async () => {
    const lockout = memoryLockout();
    const users = memoryUsers([seedUser()]);
    const login = createLogin(users, fakeIssuer, memoryLimiter(), noopAudit, fakeHasher, lockout);
    for (let i = 0; i < LOCKOUT_FAILURE_THRESHOLD; i++) {
      await login({ email: "ada@example.com", password: "wrong", ip: "1.2.3.4" });
    }
    assert.equal(lockout.blocks.length, 1);
  });

  it("rejects immediately when the lockout store reports the key as already blocked", async () => {
    const lockout = memoryLockout();
    lockout.blockedKeys.add("1.2.3.4:ada@example.com");
    const events: unknown[] = [];
    const audit: AuditEventWriter = {
      record: async (e) => {
        events.push(e);
      },
    };
    const login = createLogin(memoryUsers([seedUser()]), fakeIssuer, memoryLimiter(), audit, fakeHasher, lockout);
    const result = await login({ email: "ada@example.com", password: "longenough", ip: "1.2.3.4" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Too many login attempts/i);
    assert.ok(events.some((e) => (e as { eventType: string }).eventType === "auth.login_blocked"));
  });

  it("resets the lockout state on successful login", async () => {
    const lockout = memoryLockout();
    const login = createLogin(memoryUsers([seedUser()]), fakeIssuer, memoryLimiter(), noopAudit, fakeHasher, lockout);
    await login({ email: "ada@example.com", password: "longenough", ip: "1.2.3.4" });
    assert.equal(lockout.resets.length, 1);
  });

  it("uses the documented lockout policy constants", () => {
    assert.equal(LOCKOUT_FAILURE_THRESHOLD, 10);
    assert.equal(LOCKOUT_FAILURE_WINDOW_SECONDS, 60 * 60);
    assert.equal(LOCKOUT_BLOCK_SECONDS, 60 * 30);
  });
});