import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { MediaAsset, MediaRepository, MediaUsageLookup, ObjectStorage } from "../../domain/types.ts";
import type { StepUpStore } from "../../../auth/domain/step-up.ts";
import { createDeleteMedia } from "./delete-media.ts";
import { createGetMediaStorageStats } from "./media-storage-stats.ts";
import { createUploadMedia } from "./upload-media.ts";

function memoryMedia(seed: MediaAsset[] = []): MediaRepository {
  const rows = [...seed];
  return {
    async list() {
      return rows;
    },
    async findById(id) {
      return rows.find((m) => m.id === id) ?? null;
    },
    async create(data) {
      const now = new Date();
      const asset: MediaAsset = { id: String(rows.length + 1), ...data, createdAt: now };
      rows.push(asset);
      return asset;
    },
    async update(id, data) {
      const idx = rows.findIndex((m) => m.id === id);
      if (idx < 0) throw new Error("missing");
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((m) => m.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
    async count() {
      return rows.length;
    },
    async totalBytes() {
      return rows.reduce((sum, m) => sum + m.size, 0);
    },
  };
}

function memoryStorage(): { keys: string[]; storage: ObjectStorage } {
  const keys: string[] = [];
  return {
    keys,
    storage: {
      async put(key, _body, _contentType) {
        keys.push(key);
        return { url: `https://cdn.example.test/${key}` };
      },
      async delete(key) {
        const idx = keys.indexOf(key);
        if (idx >= 0) keys.splice(idx, 1);
      },
      async getSignedUrl(key) {
        return `https://signed.test/${key}`;
      },
    },
  };
}

function memoryAudit(): { events: AuditEventWrite[]; writer: AuditEventWriter } {
  const events: AuditEventWrite[] = [];
  return {
    events,
    writer: {
      async record(event) {
        events.push(event);
      },
    },
  };
}

function memoryStepUp(allowed = true): StepUpStore {
  return {
    async has() {
      return allowed;
    },
    async grant() {
      // no-op for unit tests
    },
    async revoke() {
      // no-op for unit tests
    },
  };
}

const baseAsset = (id: string): MediaAsset => ({
  id,
  filename: "a.png",
  storageKey: `media/${id}.png`,
  url: `https://cdn.example.test/media/${id}.png`,
  mimeType: "image/png",
  size: 100,
  alt: null,
  caption: null,
  createdAt: new Date(),
});

describe("uploadMedia", () => {
  // Minimal valid magic-byte prefixes for the allowed image types.
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
  const webpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  const bodyOf = (header: Uint8Array, pad: number) => {
    const out = new Uint8Array(header.length + 8);
    out.set(header, 0);
    for (let i = header.length; i < out.length; i++) out[i] = pad;
    return out;
  };

  it("stores a valid PNG, persists the asset and records an audit event", async () => {
    const { storage, keys } = memoryStorage();
    const repo = memoryMedia();
    const { writer, events } = memoryAudit();
    const uploadMedia = createUploadMedia(storage, repo, writer);
    const result = await uploadMedia(
      {
        filename: "hero.png",
        mimeType: "image/png",
        size: 18,
        body: bodyOf(pngHeader, 0),
      },
      "user-1",
    );
    assert.equal(result.ok, true);
    assert.equal(keys.length, 1);
    assert.match(keys[0]!, /^media\/[a-f0-9]{24}\.png$/);
    const stored = await repo.findById(result.ok ? result.value.id : "");
    assert.equal(stored?.filename, "hero.png");
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "media.uploaded");
    assert.equal(events[0]!.actorId, "user-1");
    assert.equal(events[0]!.entityId, stored?.id);
  });

  it("accepts jpeg, gif and webp magic bytes with their declared types", async () => {
    for (const [mime, header, ext] of [
      ["image/jpeg", jpegHeader, "jpg"],
      ["image/gif", gifHeader, "gif"],
      ["image/webp", webpHeader, "webp"],
    ] as const) {
      const { storage, keys } = memoryStorage();
      const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
      const result = await uploadMedia(
        {
          filename: `file.${ext}`,
          mimeType: mime,
          size: header.length + 4,
          body: bodyOf(header, 0),
        },
        "user-1",
      );
      assert.equal(result.ok, true, `expected ${mime} to be accepted`);
      assert.match(keys[0]!, new RegExp(`\\.${ext}$`));
    }
  });

  it("rejects an empty file", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({
      filename: "x.png",
      mimeType: "image/png",
      size: 0,
      body: new Uint8Array(),
    });
    assert.equal(result.ok, false);
  });

  it("rejects a file above the size limit", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({
      filename: "big.png",
      mimeType: "image/png",
      size: 11 * 1024 * 1024,
      body: bodyOf(pngHeader, 0),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /upload limit/);
  });

  it("rejects an SVG file (declarative or by extension)", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({
      filename: "evil.svg",
      mimeType: "image/svg+xml",
      size: 100,
      body: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /SVG/);
  });

  it("rejects a payload whose declared MIME type does not match its magic bytes", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({
      filename: "fake.png",
      mimeType: "image/png",
      size: 18,
      body: bodyOf(jpegHeader, 0),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /does not match/);
  });

  it("rejects a payload with no recognised magic bytes", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({
      filename: "weird.png",
      mimeType: "image/png",
      size: 16,
      body: new Uint8Array(16).fill(0x41),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /not supported/);
  });
});

describe("deleteMedia", () => {
  it("deletes the object and the record when unused, and audits it", async () => {
    const repo = memoryMedia([baseAsset("m1")]);
    const { storage, keys } = memoryStorage();
    keys.push(`media/m1.png`);
    const { writer, events } = memoryAudit();
    const usage: MediaUsageLookup = {
      async findUsages(_id) {
        return [];
      },
    };
    const deleteMedia = createDeleteMedia(repo, usage, storage, writer, memoryStepUp());
    const result = await deleteMedia("m1", "user-1");
    assert.equal(result.ok, true);
    assert.equal(await repo.findById("m1"), null);
    assert.ok(!keys.includes("media/m1.png"));
    assert.equal(events[0]!.eventType, "media.deleted");
    assert.equal(events[0]!.actorId, "user-1");
  });

  it("refuses to delete a referenced asset", async () => {
    const repo = memoryMedia([baseAsset("m1")]);
    const usage: MediaUsageLookup = {
      async findUsages(_id) {
        return [{ id: "post-1", type: "post" }];
      },
    };
    const storage: ObjectStorage = {
      put: async () => ({ url: "" }),
      delete: async () => {},
      getSignedUrl: async (key) => `https://signed.test/${key}`,
    };
    const deleteMedia = createDeleteMedia(
      repo,
      usage,
      storage,
      { record: async () => {} },
      memoryStepUp(),
    );
    const result = await deleteMedia("m1");
    assert.equal(result.ok, false);
    assert.ok(await repo.findById("m1"));
  });

  it("refuses to delete an asset referenced by a content entry", async () => {
    const repo = memoryMedia([baseAsset("m1")]);
    const usage: MediaUsageLookup = {
      async findUsages(_id) {
        return [{ id: "entry-1", type: "entry" }];
      },
    };
    const storage: ObjectStorage = {
      put: async () => ({ url: "" }),
      delete: async () => {},
      getSignedUrl: async (key) => `https://signed.test/${key}`,
    };
    const deleteMedia = createDeleteMedia(
      repo,
      usage,
      storage,
      { record: async () => {} },
      memoryStepUp(),
    );
    const result = await deleteMedia("m1");
    assert.equal(result.ok, false);
    assert.ok(await repo.findById("m1"));
  });

  it("refuses when step-up has not been confirmed recently", async () => {
    const repo = memoryMedia([baseAsset("m1")]);
    const usage: MediaUsageLookup = {
      async findUsages(_id) {
        return [];
      },
    };
    const storage: ObjectStorage = {
      put: async () => ({ url: "" }),
      delete: async () => {},
      getSignedUrl: async (key) => `https://signed.test/${key}`,
    };
    const deleteMedia = createDeleteMedia(
      repo,
      usage,
      storage,
      { record: async () => {} },
      memoryStepUp(false),
    );
    const result = await deleteMedia("m1", "user-1");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /confirm your current password/i);
    assert.ok(await repo.findById("m1"));
  });
});

describe("getMediaStorageStats", () => {
  it("sums count and bytes across assets", async () => {
    const repo = memoryMedia([baseAsset("m1"), { ...baseAsset("m2"), size: 300 }]);
    const stats = await createGetMediaStorageStats(repo)();
    assert.deepEqual(stats, { count: 2, totalBytes: 400 });
  });
});