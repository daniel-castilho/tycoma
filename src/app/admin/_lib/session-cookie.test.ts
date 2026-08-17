import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_TTL_SECONDS } from "@/modules/auth/domain/policies";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "./session-cookie.ts";

describe("SESSION_COOKIE_OPTIONS", () => {
  it("is always httpOnly", () => {
    assert.equal(SESSION_COOKIE_OPTIONS.httpOnly, true);
  });

  it("uses lax SameSite (safer than none, friendlier than strict for OAuth flows)", () => {
    assert.equal(SESSION_COOKIE_OPTIONS.sameSite, "lax");
  });

  it("scopes the cookie to the root path", () => {
    assert.equal(SESSION_COOKIE_OPTIONS.path, "/");
  });

  it("aligns the cookie lifetime with the canonical SESSION_TTL_SECONDS constant", () => {
    assert.equal(SESSION_COOKIE_OPTIONS.maxAge, SESSION_TTL_SECONDS);
    assert.equal(SESSION_TTL_SECONDS, 60 * 60 * 12);
  });

  it("uses a stable cookie name (tycoma_session)", () => {
    assert.equal(SESSION_COOKIE, "tycoma_session");
  });
});
