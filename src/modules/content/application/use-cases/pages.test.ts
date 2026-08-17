import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { Page, PageReader, PageWriter } from "../../domain/types.ts";
import { createCreatePage, createUpdatePage } from "./pages.ts";

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

function pageRow(overrides: Partial<Page>): Page {
  const now = new Date();
  return {
    id: "pg1",
    title: "About",
    slug: "about",
    body: "body",
    status: "draft",
    publishedAt: null,
    scheduledAt: null,
    parentId: null,
    featuredImageId: null,
    metaTitle: null,
    metaDescription: null,
    ogImageId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function memoryPages(seed: Page[] = []): PageReader & PageWriter {
  const rows = [...seed];
  return {
    async list() {
      return [...rows];
    },
    async findById(id) {
      return rows.find((p) => p.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((p) => p.slug === slug) ?? null;
    },
    async countByStatus() {
      return {};
    },
    async idsUsingMedia() {
      return [];
    },
    async create(data) {
      const page: Page = {
        id: `page-${rows.length + 1}`,
        title: data.title,
        slug: data.slug ?? "",
        body: data.body,
        status: data.status,
        parentId: data.parentId ?? null,
        publishedAt: data.publishedAt ?? null,
        scheduledAt: data.scheduledAt ?? null,
        featuredImageId: data.featuredImageId ?? null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        ogImageId: data.ogImageId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(page);
      return page;
    },
    async update(id, data) {
      const idx = rows.findIndex((p) => p.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((p) => p.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
  };
}

describe("createPage", () => {
  it("records a content.page_created audit event with the actor id", async () => {
    const pages = memoryPages();
    const { writer, events } = memoryAudit();
    const createPage = createCreatePage(pages, writer);
    const result = await createPage({ title: "About", body: "body", status: "draft" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.page_created");
    assert.equal(events[0]!.actorId, "user-1");
    assert.equal(events[0]!.entityType, "page");
  });

  it("does not audit a page that fails slug generation", async () => {
    const pages = memoryPages();
    const { writer, events } = memoryAudit();
    const createPage = createCreatePage(pages, writer);
    const result = await createPage({ title: "!!!", body: "body", status: "draft" }, "user-1");
    assert.equal(result.ok, false);
    assert.equal(events.length, 0);
  });
});

describe("updatePage", () => {
  it("records a content.page_updated audit event with the actor id", async () => {
    const pages = memoryPages([pageRow({})]);
    const { writer, events } = memoryAudit();
    const updatePage = createUpdatePage(pages, writer);
    const result = await updatePage("pg1", { title: "About us", body: "body", status: "draft" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventType, "content.page_updated");
    assert.equal(events[0]!.actorId, "user-1");
  });

  it("does not audit when the page does not exist", async () => {
    const pages = memoryPages();
    const { writer, events } = memoryAudit();
    const updatePage = createUpdatePage(pages, writer);
    const result = await updatePage("missing", { title: "X", body: "body", status: "draft" }, "user-1");
    assert.equal(result.ok, false);
    assert.equal(events.length, 0);
  });
});
