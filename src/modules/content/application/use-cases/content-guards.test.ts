import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Category, CategoryRepository, Page, PageReader, PageWriter, Post, PostReader, PostWriter } from "../../domain/types.ts";
import type { StepUpStore } from "../../../auth/domain/step-up.ts";
import { createDeletePage, createUpdatePage } from "./pages.ts";
import { createCreatePost, createUpdatePost, createPublishPost } from "./posts.ts";
import { createDeleteCategory, createSaveCategory } from "./taxonomy.ts";

const noopAudit = { record: async () => {} };

const okStepUp: StepUpStore = {
  async has() {
    return true;
  },
  async grant() {
    // no-op
  },
  async revoke() {
    // no-op
  },
};

function categoryRow(overrides: Partial<Category>): Category {
  return {
    id: "c1",
    name: "Cat",
    slug: "cat",
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

const noPosts: PostReader = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
  async findBySlug() {
    return null;
  },
  async countByStatus() {
    return {};
  },
  async countByCategory() {
    return 0;
  },
  async countByTag() {
    return 0;
  },
  async latestUpdated() {
    return [];
  },
  async idsUsingMedia() {
    return [];
  },
};

function postRow(overrides: Partial<Post>): Post {
  const now = new Date();
  return {
    id: "p1",
    title: "Post",
    slug: "post",
    body: "body",
    status: "draft",
    publishedAt: null,
    scheduledAt: null,
    featuredImageId: null,
    categoryIds: [],
    tagIds: [],
    metaTitle: null,
    metaDescription: null,
    ogImageId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function memoryPosts(seed: Post[] = []): PostReader & PostWriter {
  const rows = [...seed];
  return {
    ...noPosts,
    async list(query) {
      return rows.filter((p) => (query?.status ? p.status === query.status : true));
    },
    async findById(id) {
      return rows.find((p) => p.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((p) => p.slug === slug) ?? null;
    },
    async create(data) {
      rows.push(data);
      return data;
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
    async deleteMany(ids) {
      const before = rows.length;
      for (const id of ids) {
        const idx = rows.findIndex((p) => p.id === id);
        if (idx >= 0) rows.splice(idx, 1);
      }
      return before - rows.length;
    },
  };
}

describe("category hierarchy guards", () => {
  it("rejects a category whose parent is one of its own descendants (cycle)", async () => {
    const categories = memoryCategories([
      categoryRow({ id: "a", name: "A", slug: "a" }),
      categoryRow({ id: "b", name: "B", slug: "b", parentId: "a" }),
      categoryRow({ id: "c", name: "C", slug: "c", parentId: "b" }),
    ]);
    const save = createSaveCategory(categories);
    const result = await save({ id: "a", name: "A", slug: "a", parentId: "c" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /descendants/i);
  });

  it("rejects a category that would be its own parent", async () => {
    const categories = memoryCategories([categoryRow({ id: "a", name: "A", slug: "a" })]);
    const save = createSaveCategory(categories);
    const result = await save({ id: "a", name: "A", slug: "a", parentId: "a" });
    assert.equal(result.ok, false);
  });

  it("rejects a duplicate slug", async () => {
    const categories = memoryCategories([categoryRow({ id: "a", name: "A", slug: "news" })]);
    const save = createSaveCategory(categories);
    const result = await save({ name: "News", slug: "news" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /already exists/i);
  });
});

describe("deleteCategory", () => {
  it("refuses to delete a category still used by posts", async () => {
    const categories = memoryCategories([categoryRow({ id: "c1", name: "News", slug: "news" })]);
    const posts = {
      ...noPosts,
      async countByCategory() {
        return 2;
      },
    };
    const del = createDeleteCategory(categories, posts, noopAudit);
    const result = await del("c1");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /still used by posts/i);
  });
});

function pageRow(overrides: Partial<Page>): Page {
  const now = new Date();
  return {
    id: "pg1",
    title: "Page",
    slug: "page",
    body: "body",
    status: "published",
    parentId: null,
    publishedAt: now,
    scheduledAt: null,
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
      rows.push(data);
      return data;
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

describe("page guards", () => {
  it("refuses to delete a page that has children", async () => {
    const pages = memoryPages([
      pageRow({ id: "parent", slug: "parent" }),
      pageRow({ id: "child", slug: "child", parentId: "parent" }),
    ]);
    const del = createDeletePage(pages, noopAudit, okStepUp);
    const result = await del("parent");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /child pages/i);
  });

  it("deletes a leaf page", async () => {
    const pages = memoryPages([pageRow({ id: "leaf", slug: "leaf" })]);
    const del = createDeletePage(pages, noopAudit, okStepUp);
    const result = await del("leaf");
    assert.equal(result.ok, true);
  });

  it("rejects making a page its own parent", async () => {
    const pages = memoryPages([pageRow({ id: "pg1", slug: "page" })]);
    const upd = createUpdatePage(pages);
    const result = await upd("pg1", {
      title: "Page",
      body: "body",
      status: "published",
      parentId: "pg1",
    });
    assert.equal(result.ok, false);
  });
});

describe("post guards", () => {
  it("rejects creating a post with a duplicate slug", async () => {
    const posts = memoryPosts([postRow({ id: "p1", slug: "hello", title: "Hello" })]);
    const create = createCreatePost(posts, noopAudit);
    const result = await create({ title: "Hello again", slug: "hello", body: "b", status: "draft" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /already exists/i);
  });

  it("publishes a post and sets publishedAt", async () => {
    const posts = memoryPosts([postRow({ id: "p1", slug: "hello" })]);
    const publish = createPublishPost(posts, noopAudit);
    const result = await publish("p1");
    assert.equal(result.ok, true);
    const updated = await posts.findById("p1");
    assert.ok(updated);
    assert.equal(updated.status, "published");
    assert.ok(updated.publishedAt);
  });

  it("rejects updating a post to a slug owned by another post", async () => {
    const posts = memoryPosts([
      postRow({ id: "p1", slug: "one" }),
      postRow({ id: "p2", slug: "two" }),
    ]);
    const update = createUpdatePost(posts, noopAudit);
    const result = await update("p1", { title: "One", slug: "two", body: "b", status: "draft" });
    assert.equal(result.ok, false);
  });
});