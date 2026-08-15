import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User, UserRepository } from "../../domain/user.ts";
import { createCreateFirstAdmin } from "./create-first-admin.ts";

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
      const now = new Date();
      const user: User = {
        id: String(rows.length + 1),
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        avatarMediaId: null,
        createdAt: now,
        updatedAt: now,
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

describe("createFirstAdmin", () => {
  it("creates the first admin and hashes the password", async () => {
    const users = memoryUsers();
    const createFirstAdmin = createCreateFirstAdmin(users);
    const result = await createFirstAdmin({
      name: " Ada ",
      email: "Ada@Example.com",
      password: "longenough",
    });
    assert.equal(result.ok, true);
    assert.equal(await users.count(), 1);
    const stored = await users.findByEmail("ada@example.com");
    assert.ok(stored);
    assert.equal(stored.name, "Ada");
    assert.notEqual(stored.passwordHash, "longenough");
  });

  it("locks once a user already exists", async () => {
    const users = memoryUsers([
      {
        id: "1",
        email: "a@b.c",
        name: "A",
        passwordHash: "x",
        avatarMediaId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const createFirstAdmin = createCreateFirstAdmin(users);
    const result = await createFirstAdmin({
      name: "B",
      email: "b@b.c",
      password: "longenough",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /already exists/i);
    }
    assert.equal(await users.count(), 1);
  });

  it("rejects a short password", async () => {
    const createFirstAdmin = createCreateFirstAdmin(memoryUsers());
    const result = await createFirstAdmin({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    assert.equal(result.ok, false);
  });
});
