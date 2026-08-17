import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAuthSecret } from "./secret.ts";

describe("validateAuthSecret", () => {
  it("accepts a 16+ char secret outside production", () => {
    assert.equal(validateAuthSecret("x".repeat(16), { isProduction: false }), "x".repeat(16));
  });

  it("rejects a secret shorter than 16 chars outside production", () => {
    assert.throws(
      () => validateAuthSecret("short", { isProduction: false }),
      /at least 16 characters/,
    );
  });

  it("accepts a 32+ char secret in production", () => {
    assert.equal(validateAuthSecret("x".repeat(32), { isProduction: true }), "x".repeat(32));
  });

  it("rejects a 16-31 char secret in production", () => {
    assert.throws(
      () => validateAuthSecret("x".repeat(31), { isProduction: true }),
      /at least 32 characters in production/,
    );
  });

  it("rejects the documented placeholder secret in production", () => {
    assert.throws(
      () => validateAuthSecret("change-me-to-a-long-random-string", { isProduction: true }),
      /placeholder/,
    );
  });

  it("rejects a secret with leading or trailing whitespace in production", () => {
    assert.throws(
      () => validateAuthSecret(`  ${"x".repeat(32)}  `, { isProduction: true }),
      /whitespace/,
    );
  });

  it("allows a placeholder outside production as long as it is long enough", () => {
    // Dev convenience: the placeholder passes the length check, so local
    // development is not blocked while the strict rule only bites in prod.
    assert.equal(validateAuthSecret("dev-secret-long-enough-here", { isProduction: false }), "dev-secret-long-enough-here");
  });

  it("rejects a missing secret", () => {
    assert.throws(() => validateAuthSecret(undefined, { isProduction: true }), /AUTH_SECRET must be set/);
    assert.throws(() => validateAuthSecret("", { isProduction: true }), /AUTH_SECRET must be set/);
  });
});