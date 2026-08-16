import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_GENERATOR,
  canonicalise,
  checksumManifest,
  validateManifestAgainstStorage,
  type BackupManifest,
} from "./manifest";

function fixture(): BackupManifest {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-16T00:00:00.000Z",
    generator: BACKUP_GENERATOR,
    counts: { posts: 0, pages: 0, media: 2 },
    media: [
      {
        id: "m1",
        filename: "a.png",
        storageKey: "media/a.png",
        mimeType: "image/png",
        size: 100,
        alt: null,
        caption: null,
        createdAt: "2026-08-15T00:00:00.000Z",
      },
      {
        id: "m2",
        filename: "b.jpg",
        storageKey: "media/b.jpg",
        mimeType: "image/jpeg",
        size: 200,
        alt: "alt",
        caption: null,
        createdAt: "2026-08-15T00:00:00.000Z",
      },
    ],
  };
}

describe("canonicalise", () => {
  it("sorts object keys deterministically", () => {
    const a = canonicalise({ b: 1, a: 2 });
    const b = canonicalise({ a: 2, b: 1 });
    assert.equal(a, b);
  });

  it("preserves arrays", () => {
    assert.equal(canonicalise([3, 1, 2]), "[3,1,2]");
  });
});

describe("checksumManifest", () => {
  it("is identical for equal manifests regardless of key insertion order", () => {
    const left = fixture();
    const right: BackupManifest = JSON.parse(JSON.stringify(left));
    // Force a different key insertion order by re-creating the object:
    const reordered: BackupManifest = {
      media: right.media,
      counts: right.counts,
      generatedAt: right.generatedAt,
      generator: right.generator,
      schemaVersion: right.schemaVersion,
    };
    assert.equal(checksumManifest(left), checksumManifest(reordered));
  });

  it("changes when a media entry changes", () => {
    const left = fixture();
    const right: BackupManifest = JSON.parse(JSON.stringify(left));
    right.media[0]!.size = 999;
    assert.notEqual(checksumManifest(left), checksumManifest(right));
  });
});

describe("validateManifestAgainstStorage", () => {
  it("reports ok when every key is present with the expected size", async () => {
    const m = fixture();
    const report = await validateManifestAgainstStorage(m, async (key) => ({
      size: key === "media/a.png" ? 100 : 200,
    }));
    assert.equal(report.ok, true);
    assert.equal(report.missingKeys.length, 0);
    assert.equal(report.mismatchedSizes.length, 0);
  });

  it("flags missing keys", async () => {
    const m = fixture();
    const report = await validateManifestAgainstStorage(m, async () => ({ size: null }));
    assert.equal(report.ok, false);
    assert.equal(report.missingKeys.length, 2);
  });

  it("flags size mismatches", async () => {
    const m = fixture();
    const report = await validateManifestAgainstStorage(m, async (key) =>
      key === "media/a.png" ? { size: 101 } : { size: 200 },
    );
    assert.equal(report.ok, false);
    assert.equal(report.mismatchedSizes.length, 1);
    assert.equal(report.mismatchedSizes[0]!.key, "media/a.png");
  });
});
