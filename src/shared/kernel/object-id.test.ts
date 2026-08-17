import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isObjectId } from "./object-id.ts";

describe("isObjectId", () => {
  it("accepts a 24-character hexadecimal id", () => {
    assert.equal(isObjectId("6a7fcc3c44b16ae122b0f47a"), true);
  });

  it("accepts uppercase hex digits", () => {
    assert.equal(isObjectId("6A7FCC3C44B16AE122B0F47A"), true);
  });

  it("rejects malformed values", () => {
    assert.equal(isObjectId("1"), false);
    assert.equal(isObjectId("not-an-objectid"), false);
    assert.equal(isObjectId(""), false);
    assert.equal(isObjectId("6a7fcc3c44b16ae122b0f47"), false);
    assert.equal(isObjectId("6a7fcc3c44b16ae122b0f47aa"), false);
  });

  it("rejects non-strings", () => {
    assert.equal(isObjectId(null), false);
    assert.equal(isObjectId(undefined), false);
  });
});