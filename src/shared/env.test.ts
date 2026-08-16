import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEnv } from "./env.ts";

const baseDev = {
  NODE_ENV: "development" as const,
  AUTH_SECRET: "x".repeat(16),
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "mongodb://localhost:27017/tycoma",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:4566",
  S3_REGION: "us-east-1",
  S3_BUCKET: "tycoma-media",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_FORCE_PATH_STYLE: "true",
  S3_PUBLIC_BASE_URL: "http://localhost:4566/tycoma-media",
};

const prod = (overrides: Partial<typeof baseDev> = {}) => ({
  ...baseDev,
  NODE_ENV: "production" as const,
  ...overrides,
});

describe("parseEnv (AUTH_SECRET production policy)", () => {
  it("accepts a 16+ char secret in development", () => {
    const env = parseEnv(baseDev);
    assert.equal(env.AUTH_SECRET.length, 16);
  });

  it("rejects a secret shorter than 16 chars in development", () => {
    assert.throws(
      () => parseEnv({ ...baseDev, AUTH_SECRET: "short" }),
      /at least 16 characters in development/,
    );
  });

  it("rejects an empty secret", () => {
    assert.throws(
      () => parseEnv({ ...baseDev, AUTH_SECRET: "" }),
      /AUTH_SECRET must be set/,
    );
  });

  it("accepts a 32+ char secret in production", () => {
    const env = parseEnv(prod({ AUTH_SECRET: "x".repeat(32) }));
    assert.equal(env.AUTH_SECRET.length, 32);
  });

  it("rejects a 16-31 char secret in production", () => {
    assert.throws(
      () => parseEnv(prod({ AUTH_SECRET: "x".repeat(31) })),
      /at least 32 characters in production/,
    );
  });

  it("rejects the documented placeholder secret in production", () => {
    // The placeholder is 35 chars long; it passes the 32-char minimum but is
    // caught by the FORBIDDEN_AUTH_SECRETS allowlist.
    assert.throws(
      () =>
        parseEnv(prod({ AUTH_SECRET: "change-me-to-a-long-random-string" })),
      /placeholder/,
    );
  });

  it("rejects a secret with leading or trailing whitespace in production", () => {
    assert.throws(
      () => parseEnv(prod({ AUTH_SECRET: `  ${"x".repeat(32)}  ` })),
      /whitespace/,
    );
  });

  it("rejects a missing DATABASE_URL", () => {
    assert.throws(() => parseEnv({ ...baseDev, DATABASE_URL: "" }), /DATABASE_URL is required/);
  });
});
