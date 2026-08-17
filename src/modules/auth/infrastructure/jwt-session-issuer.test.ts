import assert from "node:assert/strict";
import { decodeJwt } from "jose";
import { describe, it } from "node:test";
import { SESSION_TTL_SECONDS } from "../domain/policies.ts";
import { jwtSessionIssuer } from "./jwt-session-issuer.ts";

describe("jwtSessionIssuer", () => {
  it("issues a token whose lifetime equals the canonical SESSION_TTL_SECONDS", async () => {
    const token = await jwtSessionIssuer.issue({ sub: "u1", email: "a@example.com", name: "A" });
    const payload = decodeJwt(token);
    assert.ok(payload.iat);
    assert.ok(payload.exp);
    const lifetime = (payload.exp as number) - (payload.iat as number);
    assert.ok(lifetime >= SESSION_TTL_SECONDS - 1, `lifetime ${lifetime} should be ~${SESSION_TTL_SECONDS}`);
    assert.ok(lifetime <= SESSION_TTL_SECONDS, `lifetime ${lifetime} should be ~${SESSION_TTL_SECONDS}`);
  });
});