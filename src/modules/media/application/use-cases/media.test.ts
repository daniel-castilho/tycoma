import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { MediaAsset, MediaRepository, MediaUsageLookup, ObjectStorage } from "../../domain/types.ts";
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
  it("stores the file, persists the asset and records an audit event", async () => {
    const { storage, keys } = memoryStorage();
    const repo = memoryMedia();
    const { writer, events } = memoryAudit();
    const uploadMedia = createUploadMedia(storage, repo, writer);
    const result = await uploadMedia(
      { filename: "hero.png", mimeType: "image/png", size: 2048, body: new Uint8Array([1, 2, 3]) },
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

  it("rejects an empty file", async () => {
    const { storage } = memoryStorage();
    const uploadMedia = createUploadMedia(storage, memoryMedia(), { record: async () => {} });
    const result = await uploadMedia({ filename: "x.png", mimeType: "image/png", size: 0, body: new Uint8Array() });
    assert.equal(result.ok, false);
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
    const deleteMedia = createDeleteMedia(repo, usage, storage, writer);
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
    };
    const deleteMedia = createDeleteMedia(repo, usage, storage, { record: async () => {} });
    const result = await deleteMedia("m1");
    assert.equal(result.ok, false);
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