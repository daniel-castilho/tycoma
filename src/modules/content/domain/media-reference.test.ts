import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentTypeField } from "./content-types";
import { containsMediaReference } from "./media-reference.ts";

const MEDIA_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f1f77bcf86cd799439012";

const fieldDefs: ContentTypeField[] = [
  { name: "hero", label: "Hero", type: "media", required: false },
  { name: "gallery", label: "Gallery", type: "media", required: false },
  { name: "description", label: "Description", type: "longtext", required: false },
];

describe("containsMediaReference", () => {
  it("matches a media id stored as a top-level media field value", () => {
    assert.equal(containsMediaReference({ hero: MEDIA_ID }, fieldDefs, MEDIA_ID), true);
  });

  it("matches a media id nested inside a media array", () => {
    assert.equal(containsMediaReference({ gallery: [OTHER_ID, MEDIA_ID] }, fieldDefs, MEDIA_ID), true);
  });

  it("matches a media id nested inside a media object", () => {
    assert.equal(
      containsMediaReference({ hero: { id: MEDIA_ID, crop: "square" } }, fieldDefs, MEDIA_ID),
      true,
    );
  });

  it("does not match a media id inside a non-media (longtext) field", () => {
    assert.equal(containsMediaReference({ description: MEDIA_ID }, fieldDefs, MEDIA_ID), false);
  });

  it("does not match a media id missing from the entry fields", () => {
    assert.equal(containsMediaReference({ description: "no media here" }, fieldDefs, MEDIA_ID), false);
  });

  it("returns false for non-media values in a media field", () => {
    assert.equal(containsMediaReference({ hero: 42 }, fieldDefs, MEDIA_ID), false);
    assert.equal(containsMediaReference({ hero: true }, fieldDefs, MEDIA_ID), false);
    assert.equal(containsMediaReference({ hero: null }, fieldDefs, MEDIA_ID), false);
    assert.equal(containsMediaReference({ hero: undefined }, fieldDefs, MEDIA_ID), false);
  });

  it("returns false when no field definitions are provided", () => {
    assert.equal(containsMediaReference({ hero: MEDIA_ID }, [], MEDIA_ID), false);
  });

  it("returns false for a different media id", () => {
    assert.equal(containsMediaReference({ hero: OTHER_ID }, fieldDefs, MEDIA_ID), false);
  });

  it("walks nested objects and arrays recursively", () => {
    assert.equal(
      containsMediaReference({ gallery: [{ id: OTHER_ID }, { id: MEDIA_ID }] }, fieldDefs, MEDIA_ID),
      true,
    );
  });
});