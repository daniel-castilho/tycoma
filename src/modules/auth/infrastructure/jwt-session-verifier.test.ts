import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jwtSessionVerifier } from "./jwt-session-verifier.ts";

function withEnv(env: Record<string, string | undefined>, fn: () => Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
  }
  const set = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      Object.defineProperty(process.env, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
  };
  for (const [key, value] of Object.entries(env)) {
    set(key, value);
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      set(key, value);
    }
  }
}

describe("jwtSessionVerifier (AUTH_SECRET hygiene)", () => {
  it("does not verify tokens when AUTH_SECRET is a weak placeholder", async () => {
    await withEnv({ AUTH_SECRET: "secret", NODE_ENV: "production" }, async () => {
      const result = await jwtSessionVerifier.verify("any-token");
      assert.equal(result, null);
    });
  });

  it("does not verify tokens when AUTH_SECRET is missing", async () => {
    await withEnv({ AUTH_SECRET: undefined, NODE_ENV: "production" }, async () => {
      const result = await jwtSessionVerifier.verify("any-token");
      assert.equal(result, null);
    });
  });

  it("returns null for a malformed token even with a strong secret", async () => {
    await withEnv({ AUTH_SECRET: "x".repeat(32), NODE_ENV: "production" }, async () => {
      const result = await jwtSessionVerifier.verify("not-a-jwt");
      assert.equal(result, null);
    });
  });
});