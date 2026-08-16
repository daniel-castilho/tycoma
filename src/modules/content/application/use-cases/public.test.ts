import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  Category,
  CategoryRepository,
  Menu,
  MenuItem,
  MenuRepository,
  Page,
  PageRepository,
  Post,
  PostRepository,
  Tag,
  TagRepository,
} from "../../domain/types.ts";
import {
  createGetCategoryBySlug,
  createGetPageBreadcrumb,
  createGetPublishedPageBySlug,
  createGetPublishedPostBySlug,
  createGetPublicNav,
  createGetTagBySlug,
  createListPublishedPages,
  createListPublishedPosts,
  createListPublishedPostsByCategory,
  createListPublishedPostsByTag,
} from "./public.ts";

const post = (id: string, overrides: Partial<Post> = {}): Post => ({
  id,
  title: `Post ${id}`,
  slug: id,
  body: "body",
  status: "published",
  publishedAt: new Date("2026-01-02T00:00:00Z"),
  scheduledAt: null,
  featuredImageId: null,
  categoryIds: [],
  tagIds: [],
  metaTitle: null,
  metaDescription: null,
  ogImageId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

const page = (id: string, overrides: Partial<Page> = {}): Page => ({
  id,
  title: `Page ${id}`,
  slug: id,
  body: "body",
  status: "published",
  parentId: null,
  publishedAt: new Date("2026-01-02T00:00:00Z"),
  scheduledAt: null,
  featuredImageId: null,
  metaTitle: null,
  metaDescription: null,
  ogImageId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

const category = (id: string, overrides: Partial<Category> = {}): Category => ({
  id,
  name: `Category ${id}`,
  slug: id,
  description: null,
  parentId: null,
  ...overrides,
});

const tag = (id: string, overrides: Partial<Tag> = {}): Tag => ({
  id,
  name: `Tag ${id}`,
  slug: id,
  description: null,
  ...overrides,
});

function memoryPostRepo(seed: Post[] = []): PostRepository {
  const rows = [...seed];
  return {
    async list(query = {}) {
      return rows.filter(
        (r) =>
          (query.status ? r.status === query.status : true) &&
          (query.categoryId ? r.categoryIds.includes(query.categoryId) : true) &&
          (query.tagId ? r.tagIds.includes(query.tagId) : true),
      );
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((r) => r.slug === slug) ?? null;
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
      return rows;
    },
    async idsUsingMedia() {
      return [];
    },
    async create(data) {
      rows.push(data);
      return data;
    },
    async update(id, data) {
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete(id) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
    async deleteMany(ids) {
      const target = new Set(ids);
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (target.has(rows[i]!.id)) rows.splice(i, 1);
      }
      return before - rows.length;
    },
  };
}

function memoryPageRepo(seed: Page[] = []): PageRepository {
  const rows = [...seed];
  return {
    async list() {
      return rows;
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((r) => r.slug === slug) ?? null;
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
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete() {},
  };
}

function memoryCategoryRepo(seed: Category[] = []): CategoryRepository {
  const rows = [...seed];
  return {
    async list() {
      return rows;
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((r) => r.slug === slug) ?? null;
    },
    async create(data) {
      rows.push(data);
      return data;
    },
    async update(id, data) {
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete() {},
  };
}

function memoryTagRepo(seed: Tag[] = []): TagRepository {
  const rows = [...seed];
  return {
    async list() {
      return rows;
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findBySlug(slug) {
      return rows.find((r) => r.slug === slug) ?? null;
    },
    async create(data) {
      rows.push(data);
      return data;
    },
    async update(id, data) {
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx]!, ...data };
      return rows[idx]!;
    },
    async delete() {},
  };
}

function memoryMenuRepo(seedMenus: Menu[] = [], seedItems: MenuItem[] = []): MenuRepository {
  const menus = [...seedMenus];
  const items = [...seedItems];
  return {
    async list() {
      return menus;
    },
    async findById(id) {
      return menus.find((m) => m.id === id) ?? null;
    },
    async listItems(menuId) {
      return items.filter((i) => i.menuId === menuId);
    },
    async create(data) {
      menus.push(data);
      return data;
    },
    async update(id, data) {
      const idx = menus.findIndex((m) => m.id === id);
      menus[idx] = { ...menus[idx]!, ...data };
      return menus[idx]!;
    },
    async delete(id) {
      const idx = menus.findIndex((m) => m.id === id);
      if (idx >= 0) menus.splice(idx, 1);
    },
    async replaceItems() {},
  };
}

const menuItem = (id: string, menuId: string, overrides: Partial<MenuItem> = {}): MenuItem => ({
  id,
  menuId,
  parentId: null,
  label: id,
  type: "custom",
  refId: null,
  url: null,
  sortOrder: 0,
  ...overrides,
});

describe("listPublishedPosts", () => {
  it("returns only published posts", async () => {
    const posts = memoryPostRepo([
      post("a"),
      post("b", { status: "draft" }),
      post("c", { status: "scheduled" }),
    ]);
    const result = await createListPublishedPosts(posts)();
    assert.deepEqual(result.map((p) => p.id), ["a"]);
  });
});

describe("getPublishedPostBySlug", () => {
  it("returns a published post by slug", async () => {
    const posts = memoryPostRepo([post("hello", { slug: "hello-world" })]);
    const result = await createGetPublishedPostBySlug(posts)("hello-world");
    assert.equal(result?.id, "hello");
  });

  it("returns null for a draft post", async () => {
    const posts = memoryPostRepo([post("hello", { slug: "hello-world", status: "draft" })]);
    const result = await createGetPublishedPostBySlug(posts)("hello-world");
    assert.equal(result, null);
  });

  it("returns null when the slug does not exist", async () => {
    const result = await createGetPublishedPostBySlug(memoryPostRepo())("missing");
    assert.equal(result, null);
  });
});

describe("listPublishedPages", () => {
  it("filters out non-published pages", async () => {
    const pages = memoryPageRepo([page("a"), page("b", { status: "draft" })]);
    const result = await createListPublishedPages(pages)();
    assert.deepEqual(result.map((p) => p.id), ["a"]);
  });
});

describe("getPublishedPageBySlug", () => {
  it("returns a published page by slug", async () => {
    const pages = memoryPageRepo([page("about", { slug: "about" })]);
    const result = await createGetPublishedPageBySlug(pages)("about");
    assert.equal(result?.id, "about");
  });

  it("returns null for a draft page", async () => {
    const pages = memoryPageRepo([page("about", { slug: "about", status: "draft" })]);
    const result = await createGetPublishedPageBySlug(pages)("about");
    assert.equal(result, null);
  });
});

describe("getPageBreadcrumb", () => {
  it("returns ancestors from root to the page", async () => {
    const pages = memoryPageRepo([
      page("home", { slug: "home", id: "home" }),
      page("about", { slug: "about", id: "about", parentId: "home" }),
      page("team", { slug: "team", id: "team", parentId: "about" }),
    ]);
    const breadcrumb = await createGetPageBreadcrumb(pages)("team");
    assert.deepEqual(
      breadcrumb.map((p) => p.id),
      ["home", "about", "team"],
    );
  });

  it("returns only the page itself when it has no parent", async () => {
    const pages = memoryPageRepo([page("about", { slug: "about" })]);
    const breadcrumb = await createGetPageBreadcrumb(pages)("about");
    assert.deepEqual(
      breadcrumb.map((p) => p.id),
      ["about"],
    );
  });

  it("skips unpublished ancestors", async () => {
    const pages = memoryPageRepo([
      page("home", { slug: "home", id: "home", status: "draft" }),
      page("about", { slug: "about", id: "about", parentId: "home" }),
    ]);
    const breadcrumb = await createGetPageBreadcrumb(pages)("about");
    assert.deepEqual(
      breadcrumb.map((p) => p.id),
      ["about"],
    );
  });

  it("returns an empty list when the page is not published", async () => {
    const pages = memoryPageRepo([page("about", { slug: "about", status: "draft" })]);
    const breadcrumb = await createGetPageBreadcrumb(pages)("about");
    assert.deepEqual(breadcrumb, []);
  });

  it("stops at a missing parent instead of looping forever", async () => {
    const pages = memoryPageRepo([
      page("team", { slug: "team", id: "team", parentId: "missing" }),
    ]);
    const breadcrumb = await createGetPageBreadcrumb(pages)("team");
    assert.deepEqual(
      breadcrumb.map((p) => p.id),
      ["team"],
    );
  });
});

describe("getCategoryBySlug / getTagBySlug", () => {
  it("finds a category by slug", async () => {
    const result = await createGetCategoryBySlug(memoryCategoryRepo([category("tech")]))("tech");
    assert.equal(result?.id, "tech");
  });

  it("finds a tag by slug", async () => {
    const result = await createGetTagBySlug(memoryTagRepo([tag("node")]))("node");
    assert.equal(result?.id, "node");
  });
});

describe("listPublishedPostsByCategory / ByTag", () => {
  it("filters published posts by categoryId", async () => {
    const posts = memoryPostRepo([
      post("a", { categoryIds: ["cat-1"] }),
      post("b", { categoryIds: ["cat-1"], status: "draft" }),
      post("c", { categoryIds: ["cat-2"] }),
    ]);
    const result = await createListPublishedPostsByCategory(posts)("cat-1");
    assert.deepEqual(result.map((p) => p.id), ["a"]);
  });

  it("filters published posts by tagId", async () => {
    const posts = memoryPostRepo([
      post("a", { tagIds: ["tag-1"] }),
      post("b", { tagIds: ["tag-1"], status: "draft" }),
      post("c", { tagIds: ["tag-2"] }),
    ]);
    const result = await createListPublishedPostsByTag(posts)("tag-1");
    assert.deepEqual(result.map((p) => p.id), ["a"]);
  });
});

describe("getPublicNav", () => {
  it("resolves menu items to public hrefs and nests children", async () => {
    const menus = memoryMenuRepo(
      [{ id: "m1", name: "Main", slug: "main" }],
      [
        menuItem("i1", "m1", { label: "Home", type: "custom", url: "/" }),
        menuItem("i2", "m1", { label: "About", type: "page", refId: "about" }),
        menuItem("i3", "m1", { label: "Child", parentId: "i2", type: "page", refId: "team", sortOrder: 1 }),
        menuItem("i4", "m1", { label: "News", type: "category", refId: "news" }),
        menuItem("i5", "m1", { label: "Post", type: "post", refId: "post-1" }),
        menuItem("i6", "m1", { label: "Broken", type: "post", refId: "missing" }),
      ],
    );
    const posts = memoryPostRepo([post("post-1", { slug: "my-post" })]);
    const pages = memoryPageRepo([page("about"), page("team", { slug: "team" })]);
    const categories = memoryCategoryRepo([category("news", { slug: "news" })]);

    const nav = await createGetPublicNav(menus, posts, pages, categories)("main");

    assert.equal(nav.length, 4);
    assert.equal(nav[0]!.href, "/");
    assert.equal(nav[1]!.href, "/about");
    assert.deepEqual(nav[1]!.children.map((c) => c.href), ["/team"]);
    assert.equal(nav[2]!.href, "/categories/news");
    assert.equal(nav[3]!.href, "/posts/my-post");
  });

  it("skips items whose ref resolves to unpublished content", async () => {
    const menus = memoryMenuRepo(
      [{ id: "m1", name: "Main", slug: "main" }],
      [menuItem("i1", "m1", { label: "Draft", type: "page", refId: "draft" })],
    );
    const pages = memoryPageRepo([page("draft", { status: "draft" })]);
    const nav = await createGetPublicNav(menus, memoryPostRepo(), pages, memoryCategoryRepo())("main");
    assert.deepEqual(nav, []);
  });

  it("uses the main menu by default and returns empty when no menu exists", async () => {
    const menus = memoryMenuRepo([{ id: "m1", name: "Footer", slug: "footer" }], []);
    const nav = await createGetPublicNav(menus, memoryPostRepo(), memoryPageRepo(), memoryCategoryRepo())();
    assert.equal(nav.length, 0);
  });
});