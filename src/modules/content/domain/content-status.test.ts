import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseContentStatus } from "./content-status.ts";

describe("parseContentStatus", () => {
  it("accepts every known status", () => {
    assert.equal(parseContentStatus("draft"), "draft");
    assert.equal(parseContentStatus("scheduled"), "scheduled");
    assert.equal(parseContentStatus("published"), "published");
  });

  it("throws on an unknown status instead of degrading silently", () => {
    assert.throws(() => parseContentStatus("archived"), /Unknown content status/);
    assert.throws(() => parseContentStatus(""), /Unknown content status/);
  });
});
