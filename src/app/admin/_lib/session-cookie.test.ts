import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "./session-cookie.ts";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

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

  it("aligns the cookie lifetime with the JWT 7-day expiry", () => {
    assert.equal(SESSION_COOKIE_OPTIONS.maxAge, SEVEN_DAYS);
  });

  it("uses a stable cookie name (tycoma_session)", () => {
    assert.equal(SESSION_COOKIE, "tycoma_session");
  });
});
