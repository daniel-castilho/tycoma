import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { Category, CategoryRepository, Tag, TagRepository } from "../../domain/types.ts";
import { createSaveCategory, createSaveTag } from "./taxonomy.ts";

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

function categoryRow(overrides: Partial<Category>): Category {
  return {
    id: "c1",
    name: "News",
    slug: "news",
    description: null,
    parentId: null,
    ...overrides,
  };
}

function memoryCategories(seed: Category[] = []): CategoryRepository {
  const rows = [...seed];
  return {
    async list() {
      return [...rows];
    },
    async findById(id) {
      return rows.find((c) => c.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((c) => c.slug === slug) ?? null;
    },
    async create(data) {
      rows.push(data);
      return data;
    },
    async update(id, data) {
      const idx = rows.findIndex((c) => c.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((c) => c.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
  };
}

function tagRow(overrides: Partial<Tag>): Tag {
  return {
    id: "t1",
    name: "Tag",
    slug: "tag",
    description: null,
    ...overrides,
  };
}

function memoryTags(seed: Tag[] = []): TagRepository {
  const rows = [...seed];
  return {
    async list() {
      return [...rows];
    },
    async findById(id) {
      return rows.find((t) => t.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((t) => t.slug === slug) ?? null;
    },
    async create(data) {
      rows.push(data);
      return data;
    },
    async update(id, data) {
      const idx = rows.findIndex((t) => t.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((t) => t.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
  };
}

describe("saveCategory", () => {
  it("records a content.category_created audit event with the actor id", async () => {
    const categories = memoryCategories();
    const { writer, events } = memoryAudit();
    const saveCategory = createSaveCategory(categories, writer);
    const result = await saveCategory({ name: "News", slug: "news" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.category_created");
    assert.equal(events[0]!.actorId, "user-1");
    assert.equal(events[0]!.entityType, "category");
  });

  it("records a content.category_updated audit event with the actor id", async () => {
    const categories = memoryCategories([categoryRow({})]);
    const { writer, events } = memoryAudit();
    const saveCategory = createSaveCategory(categories, writer);
    const result = await saveCategory({ id: "c1", name: "Newsroom", slug: "newsroom" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.category_updated");
    assert.equal(events[0]!.actorId, "user-1");
  });

  it("does not audit a duplicate slug rejection", async () => {
    const categories = memoryCategories([categoryRow({})]);
    const { writer, events } = memoryAudit();
    const saveCategory = createSaveCategory(categories, writer);
    const result = await saveCategory({ name: "News", slug: "news" }, "user-1");
    assert.equal(result.ok, false);
    assert.equal(events.length, 0);
  });
});

describe("saveTag", () => {
  it("records a content.tag_created audit event with the actor id", async () => {
    const tags = memoryTags();
    const { writer, events } = memoryAudit();
    const saveTag = createSaveTag(tags, writer);
    const result = await saveTag({ name: "Tag", slug: "tag" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.tag_created");
    assert.equal(events[0]!.actorId, "user-1");
  });

  it("records a content.tag_updated audit event with the actor id", async () => {
    const tags = memoryTags([tagRow({})]);
    const { writer, events } = memoryAudit();
    const saveTag = createSaveTag(tags, writer);
    const result = await saveTag({ id: "t1", name: "Tags", slug: "tags" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.tag_updated");
    assert.equal(events[0]!.actorId, "user-1");
  });
});
