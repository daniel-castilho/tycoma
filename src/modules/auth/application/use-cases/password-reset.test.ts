import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { AuditEventWriter } from "../../../audit/domain/types.ts";
import type { Mailer } from "../../domain/mailer.ts";
import type { PasswordHasher } from "../../domain/password-hasher.ts";
import type { PasswordResetToken, PasswordResetTokenRepository } from "../../domain/password-reset-token.ts";
import type { TokenHasher } from "../../domain/token-hasher.ts";
import type { User, UserRepository } from "../../domain/user.ts";
import { PASSWORD_RESET_TOKEN_BYTES } from "../../domain/policies.ts";
import { createRequestPasswordReset } from "./request-password-reset.ts";
import { createResetPassword } from "./reset-password.ts";

const noopAudit = { record: async () => {} };

const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async verify(password, hash) {
    return hash === `hashed:${password}`;
  },
};

const fakeTokenHasher: TokenHasher = {
  async generateRaw() {
    return "ab".repeat(32);
  },
  async hash(raw) {
    return createHash("sha256").update(raw).digest("hex");
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

function memoryTokens(): { repo: PasswordResetTokenRepository; rows: PasswordResetToken[] } {
  const rows: PasswordResetToken[] = [];
  const repo: PasswordResetTokenRepository = {
    async create(data) {
      const token: PasswordResetToken = {
        id: String(rows.length + 1),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
      };
      rows.push(token);
      return token;
    },
    async findValidByHash(tokenHash, now) {
      return (
        rows.find((t) => t.tokenHash === tokenHash && !t.usedAt && t.expiresAt.getTime() > now.getTime()) ?? null
      );
    },
    async markUsed(id, usedAt) {
      const row = rows.find((t) => t.id === id);
      if (row) row.usedAt = usedAt;
    },
  };
  return { repo, rows };
}

function seedUser(email = "ada@example.com"): User {
  return {
    id: "u1",
    email,
    name: "Ada",
    passwordHash: "hashed:old",
    avatarMediaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("requestPasswordReset", () => {
  it("creates a hashed token and sends a reset link for an existing user", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo, rows } = memoryTokens();
    let sentTo: string | null = null;
    const mailer: Mailer = {
      sendPasswordReset: async (to) => {
        sentTo = to;
      },
    };
    const request = createRequestPasswordReset(users, repo, fakeTokenHasher, mailer, { hit: async () => ({ allowed: true, remaining: 4 }) }, noopAudit);
    const result = await request({ email: "Ada@Example.com", ip: "1.2.3.4", appUrl: "https://example.com" });
    assert.equal(result.ok, true);
    assert.equal(sentTo, "ada@example.com");
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0]!.tokenHash, "");
    assert.ok(!rows[0]!.tokenHash.includes("."));
  });

  it("succeeds silently for an unknown email to avoid account enumeration", async () => {
    const users = memoryUsers();
    const { repo } = memoryTokens();
    const sent: string[] = [];
    const mailer: Mailer = {
      sendPasswordReset: async (to) => {
        sent.push(to);
      },
    };
    const request = createRequestPasswordReset(users, repo, fakeTokenHasher, mailer, { hit: async () => ({ allowed: true, remaining: 4 }) }, noopAudit);
    const result = await request({ email: "nobody@example.com", ip: "1.2.3.4", appUrl: "https://example.com" });
    assert.equal(result.ok, true);
    assert.equal(sent.length, 0);
  });

  it("rejects when the rate limiter denies", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo } = memoryTokens();
    const request = createRequestPasswordReset(
      users,
      repo,
      fakeTokenHasher,
      { sendPasswordReset: async () => {} },
      { hit: async () => ({ allowed: false, remaining: 0 }) },
      noopAudit,
    );
    const result = await request({ email: "ada@example.com", ip: "1.2.3.4", appUrl: "https://example.com" });
    assert.equal(result.ok, false);
  });

  it("passes the reset token only to the mailer, never in the result", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo } = memoryTokens();
    let deliveredToken: string | null = null;
    const mailer: Mailer = {
      sendPasswordReset: async (_to, mail) => {
        deliveredToken = mail.token;
      },
    };
    const request = createRequestPasswordReset(
      users,
      repo,
      fakeTokenHasher,
      mailer,
      { hit: async () => ({ allowed: true, remaining: 4 }) },
      noopAudit,
    );
    const result = await request({ email: "ada@example.com", ip: "1.2.3.4", appUrl: "https://example.com" });
    assert.equal(result.ok, true);
    assert.ok(deliveredToken !== null, "mailer must receive the token");
    const token = deliveredToken as string;
    assert.equal(token.length, PASSWORD_RESET_TOKEN_BYTES * 2);
    const serializedResult = JSON.stringify(result);
    assert.ok(!serializedResult.includes(token), "reset token must never appear in the use-case result");
  });
});

describe("resetPassword", () => {
  it("hashes the new password, marks the token used and audits the completion", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo, rows } = memoryTokens();
    const raw = "some-raw-token";
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await repo.create({ userId: "u1", tokenHash, expiresAt: new Date(Date.now() + 60_000) });
    const events: unknown[] = [];
    const audit: AuditEventWriter = {
      record: async (e) => {
        events.push(e);
      },
    };
    const reset = createResetPassword(users, repo, fakeTokenHasher, audit, fakeHasher);
    const result = await reset({ token: raw, password: "newlongpassword" });
    assert.equal(result.ok, true);
    const stored = await users.findById("u1");
    assert.ok(stored);
    assert.equal(stored.passwordHash, "hashed:newlongpassword");
    assert.equal(rows[0]!.usedAt !== null, true);
    assert.ok(events.some((e) => (e as { eventType: string }).eventType === "auth.password_reset_completed"));
  });

  it("rejects an invalid or expired token", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo } = memoryTokens();
    await repo.create({ userId: "u1", tokenHash: "thehash", expiresAt: new Date(Date.now() - 60_000) });
    const reset = createResetPassword(users, repo, fakeTokenHasher, noopAudit, fakeHasher);
    const result = await reset({ token: "wrong-token", password: "newlongpassword" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /invalid or has expired/i);
  });

  it("rejects a short new password", async () => {
    const users = memoryUsers([seedUser()]);
    const { repo } = memoryTokens();
    const reset = createResetPassword(users, repo, fakeTokenHasher, noopAudit, fakeHasher);
    const result = await reset({ token: "any-token", password: "short" });
    assert.equal(result.ok, false);
  });
});