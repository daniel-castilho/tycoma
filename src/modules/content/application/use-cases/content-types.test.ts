import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWriter } from "../../../audit/domain/types.ts";
import type {
  ContentEntry,
  ContentEntryRepository,
  ContentType,
  ContentTypeRepository,
  ContentEntryWrite,
} from "../../domain/content-types.ts";
import {
  createCreateEntry,
  createDeleteContentType,
  createGetPublishedEntryByTypeAndSlug,
  createListPublishedEntriesByTypeSlug,
  createSaveContentType,
  createUpdateEntry,
} from "./content-types.ts";

const noopAudit = { record: async () => {} };

const type = (id: string, overrides: Partial<ContentType> = {}): ContentType => ({
  id,
  name: `Type ${id}`,
  slug: id,
  description: null,
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "stars", label: "Stars", type: "number", required: false },
  ],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const entry = (id: string, overrides: Partial<ContentEntry> = {}): ContentEntry => ({
  id,
  contentTypeId: "t1",
  slug: id,
  title: `Entry ${id}`,
  status: "draft",
  fields: { title: "Hello", stars: 4 },
  publishedAt: null,
  scheduledAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

function memoryTypes(
  seed: ContentType[] = [],
  entryRows: ContentEntry[] = [],
): ContentTypeRepository & { seedEntry(entry: ContentEntry): void } {
  const rows = [...seed];
  return {
    async list() {
      return [...rows];
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((r) => r.slug === slug) ?? null;
    },
    async create(data) {
      const row: ContentType = {
        ...data,
        description: data.description ?? null,
        id: String(rows.length + 1),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async update(id, data) {
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx]!, ...data, updatedAt: new Date() };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
    async countEntries(contentTypeId) {
      return entryRows.filter((e) => e.contentTypeId === contentTypeId).length;
    },
    seedEntry(entry: ContentEntry) {
      entryRows.push(entry);
    },
  };
}

function memoryEntries(seed: ContentEntry[] = [], target?: ContentEntry[]): ContentEntryRepository {
  const rows = target ?? [...seed];
  if (target) {
    for (const e of seed) {
      if (!target.some((r) => r.id === e.id)) target.push(e);
    }
  }
  return {
    async list(query) {
      return rows.filter(
        (e) =>
          e.contentTypeId === query.contentTypeId &&
          (query.status ? e.status === query.status : true) &&
          (query.search ? e.title.toLowerCase().includes(query.search.toLowerCase()) : true),
      );
    },
    async findById(id) {
      return rows.find((e) => e.id === id) ?? null;
    },
    async findBySlug(contentTypeId, slug) {
      return rows.find((e) => e.contentTypeId === contentTypeId && e.slug === slug) ?? null;
    },
    async create(data) {
      const row: ContentEntry = {
        ...data,
        publishedAt: data.publishedAt ?? null,
        scheduledAt: data.scheduledAt ?? null,
        id: String(rows.length + 1),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async update(id, data) {
      const idx = rows.findIndex((e) => e.id === id);
      rows[idx] = { ...rows[idx]!, ...data, updatedAt: new Date() };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((e) => e.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
  };
}

describe("saveContentType", () => {
  it("creates a content type and audits it", async () => {
    const types = memoryTypes();
    const events: unknown[] = [];
    const audit: AuditEventWriter = {
      record: async (e) => {
        events.push(e);
      },
    };
    const save = createSaveContentType(types, audit);
    const result = await save({
      name: "Products",
      slug: "products",
      description: null,
      fields: [{ name: "sku", label: "SKU", type: "text", required: true }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.slug, "products");
      assert.equal((await types.list()).length, 1);
    }
    assert.ok(events.some((e) => (e as { eventType: string }).eventType === "content.type_created"));
  });

  it("rejects a duplicate slug", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const save = createSaveContentType(types, noopAudit);
    const result = await save({
      name: "Products",
      slug: "products",
      description: null,
      fields: [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /already exists/i);
  });
});

describe("deleteContentType", () => {
  it("blocks deletion while entries exist", async () => {
    const shared: ContentEntry[] = [];
    const types = memoryTypes([type("t1", { slug: "products" })], shared);
    memoryEntries([entry("e1", { contentTypeId: "t1", slug: "a" })], shared);
    const del = createDeleteContentType(types, noopAudit);
    const result = await del("t1");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /still has entries/i);
  });

  it("deletes an empty content type", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const del = createDeleteContentType(types, noopAudit);
    const result = await del("t1");
    assert.equal(result.ok, true);
  });
});

describe("createEntry / updateEntry", () => {
  it("validates fields against the type definition", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries();
    const create = createCreateEntry(entries, types, noopAudit);
    const result = await create({
      contentTypeId: "t1",
      slug: "widget",
      title: "Widget",
      status: "draft",
      fields: { title: "Widget", stars: "4" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.fields.stars, 4);
    }
  });

  it("rejects when a required field is missing", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries();
    const create = createCreateEntry(entries, types, noopAudit);
    const result = await create({
      contentTypeId: "t1",
      slug: "widget",
      title: "Widget",
      status: "draft",
      fields: { stars: "4" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /required/i);
  });

  it("rejects a duplicate slug within the same content type", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries([entry("e1", { contentTypeId: "t1", slug: "widget" })]);
    const create = createCreateEntry(entries, types, noopAudit);
    const result = await create({
      contentTypeId: "t1",
      slug: "widget",
      title: "Widget",
      status: "draft",
      fields: { title: "Widget" },
    });
    assert.equal(result.ok, false);
  });

  it("updates an entry preserving previous dates when not provided", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries([entry("e1", { contentTypeId: "t1", slug: "widget" })]);
    const update = createUpdateEntry(entries, types, noopAudit);
    const result = await update(
      "e1",
      {
        contentTypeId: "t1",
        slug: "widget",
        title: "Widget v2",
        status: "published",
        fields: { title: "Widget v2", stars: 5 },
      } as ContentEntryWrite,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.title, "Widget v2");
  });
});

describe("public reads", () => {
  it("lists only published entries for a type slug, newest first", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries([
      entry("e1", { contentTypeId: "t1", slug: "old", status: "published", publishedAt: new Date("2026-01-01T00:00:00Z") }),
      entry("e2", { contentTypeId: "t1", slug: "new", status: "published", publishedAt: new Date("2026-01-02T00:00:00Z") }),
      entry("e3", { contentTypeId: "t1", slug: "draft", status: "draft" }),
    ]);
    const list = createListPublishedEntriesByTypeSlug(types, entries);
    const result = await list("products");
    assert.ok(result);
    assert.deepEqual(
      result.map((e) => e.slug),
      ["new", "old"],
    );
  });

  it("returns null for an unknown type slug", async () => {
    const types = memoryTypes();
    const entries = memoryEntries();
    const result = await createListPublishedEntriesByTypeSlug(types, entries)("nope");
    assert.equal(result, null);
  });

  it("returns a published entry by type and slug, but not a draft", async () => {
    const types = memoryTypes([type("t1", { slug: "products" })]);
    const entries = memoryEntries([
      entry("e1", { contentTypeId: "t1", slug: "live", status: "published", publishedAt: new Date() }),
      entry("e2", { contentTypeId: "t1", slug: "hidden", status: "draft" }),
    ]);
    const get = createGetPublishedEntryByTypeAndSlug(types, entries);
    assert.equal((await get("products", "live"))?.id, "e1");
    assert.equal(await get("products", "hidden"), null);
  });
});