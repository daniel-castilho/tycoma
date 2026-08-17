import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { argon2PasswordHasher } from "./argon2-password-hasher.ts";

describe("argon2PasswordHasher", () => {
  it("hashes with Argon2id at the OWASP baseline and verifies the roundtrip", async () => {
    const hash = await argon2PasswordHasher.hash("s3cret!pass");
    assert.match(hash, /^\$argon2id\$/);
    assert.match(hash, /m=65536,t=3,p=1/);
    assert.equal(await argon2PasswordHasher.verify("s3cret!pass", hash), true);
    assert.equal(await argon2PasswordHasher.verify("wrong", hash), false);
  });

  it("throws on a malformed stored hash instead of conflating it with a mismatch", async () => {
    await assert.rejects(
      argon2PasswordHasher.verify("anything", "not-an-argon2-hash"),
      /Decoding failed|corrupt|decode/i,
    );
  });
});