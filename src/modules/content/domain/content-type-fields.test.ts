import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIELD_COERCERS, isContentFieldType, validateEntryFields } from "./content-type-fields.ts";
import type { ContentType } from "./content-types.ts";

const type = (fields: ContentType["fields"]): Pick<ContentType, "fields"> => ({ fields });

describe("FIELD_COERCERS (strategy per field kind)", () => {
  it("coerces text and longtext to strings", () => {
    assert.equal(FIELD_COERCERS.text("hello"), "hello");
    assert.equal(FIELD_COERCERS.longtext("body"), "body");
    assert.equal(FIELD_COERCERS.text(123), undefined);
  });

  it("coerces numbers from numbers and numeric strings", () => {
    assert.equal(FIELD_COERCERS.number(42), 42);
    assert.equal(FIELD_COERCERS.number("3.5"), 3.5);
    assert.equal(FIELD_COERCERS.number("not-a-number"), undefined);
    assert.equal(FIELD_COERCERS.number(Number.NaN), undefined);
  });

  it("coerces booleans from booleans and form values", () => {
    assert.equal(FIELD_COERCERS.boolean(true), true);
    assert.equal(FIELD_COERCERS.boolean("on"), true);
    assert.equal(FIELD_COERCERS.boolean("true"), true);
    assert.equal(FIELD_COERCERS.boolean("false"), false);
    assert.equal(FIELD_COERCERS.boolean("garbage"), undefined);
  });

  it("coerces dates from Date objects and ISO strings", () => {
    const d = new Date("2026-01-02T00:00:00Z");
    assert.equal(FIELD_COERCERS.date(d), d);
    const parsed = FIELD_COERCERS.date("2026-01-02T00:00:00Z");
    assert.ok(parsed instanceof Date);
    assert.equal((parsed as Date).toISOString(), d.toISOString());
    assert.equal(FIELD_COERCERS.date("nope"), undefined);
  });
});

describe("validateEntryFields", () => {
  it("keeps valid values and coerces form strings", () => {
    const result = validateEntryFields(
      type([
        { name: "title", label: "Title", type: "text", required: true },
        { name: "stars", label: "Stars", type: "number", required: false },
        { name: "active", label: "Active", type: "boolean", required: false },
      ]),
      { title: "Hello", stars: "4", active: "on" },
    );
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.title, "Hello");
    assert.equal(result.value.stars, 4);
    assert.equal(result.value.active, true);
  });

  it("flags missing required fields and drops unknown fields", () => {
    const result = validateEntryFields(
      type([{ name: "title", label: "Title", type: "text", required: true }]),
      { title: "", unknownField: "x" },
    );
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0]!.message, /required/i);
    assert.equal("unknownField" in result.value, false);
  });

  it("flags invalid values for a declared kind", () => {
    const result = validateEntryFields(
      type([{ name: "count", label: "Count", type: "number", required: true }]),
      { count: "abc" },
    );
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0]!.message, /invalid/i);
  });
});

describe("isContentFieldType", () => {
  it("accepts every known kind and rejects the rest", () => {
    for (const kind of ["text", "longtext", "number", "boolean", "date"] as const) {
      assert.equal(isContentFieldType(kind), true);
    }
    assert.equal(isContentFieldType("media"), false);
    assert.equal(isContentFieldType(""), false);
  });
});