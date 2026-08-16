import type {
  Category,
  CategoryRepository,
  MenuItem,
  MenuItemType,
  MenuReader,
  Page,
  PageReader,
  Post,
  PostReader,
  Tag,
  TagRepository,
} from "../../domain/types";

export type PublicNavLink = {
  id: string;
  label: string;
  href: string | null;
  children: PublicNavLink[];
};

export function createListPublishedPosts(posts: PostReader) {
  return async function listPublishedPosts(): Promise<Post[]> {
    return posts.list({ status: "published", sort: "publishedAt", order: "desc" });
  };
}

export function createGetPublishedPostBySlug(posts: PostReader) {
  return async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
    const post = await posts.findBySlug(slug);
    return post && post.status === "published" ? post : null;
  };
}

export function createListPublishedPages(pages: PageReader) {
  return async function listPublishedPages(): Promise<Page[]> {
    return (await pages.list()).filter((p) => p.status === "published");
  };
}

export function createGetPublishedPageBySlug(pages: PageReader) {
  return async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
    const page = await pages.findBySlug(slug);
    return page && page.status === "published" ? page : null;
  };
}

export function createGetCategoryBySlug(categories: CategoryRepository) {
  return async function getCategoryBySlug(slug: string): Promise<Category | null> {
    return categories.findBySlug(slug);
  };
}

export function createGetTagBySlug(tags: TagRepository) {
  return async function getTagBySlug(slug: string): Promise<Tag | null> {
    return tags.findBySlug(slug);
  };
}

export function createListPublishedPostsByCategory(posts: PostReader) {
  return async function listPublishedPostsByCategory(categoryId: string): Promise<Post[]> {
    return posts.list({
      status: "published",
      categoryId,
      sort: "publishedAt",
      order: "desc",
    });
  };
}

export function createListPublishedPostsByTag(posts: PostReader) {
  return async function listPublishedPostsByTag(tagId: string): Promise<Post[]> {
    return posts.list({ status: "published", tagId, sort: "publishedAt", order: "desc" });
  };
}

export function createGetPublicNav(
  menus: MenuReader,
  posts: PostReader,
  pages: PageReader,
  categories: CategoryRepository,
) {
  return async function getPublicNav(menuSlug?: string): Promise<PublicNavLink[]> {
    const all = await menus.list();
    const menu = menuSlug
      ? all.find((m) => m.slug === menuSlug) ?? null
      : all.find((m) => m.slug === "main") ?? all[0] ?? null;
    if (!menu) return [];
    const items = await menus.listItems(menu.id);

    const slugByRefId = async (
      type: MenuItemType,
      refId: string | null,
    ): Promise<string | null> => {
      if (!refId) return null;
      if (type === "post") {
        const post = await posts.findById(refId);
        return post && post.status === "published" ? post.slug : null;
      }
      if (type === "page") {
        const page = await pages.findById(refId);
        return page && page.status === "published" ? page.slug : null;
      }
      if (type === "category") return (await categories.findById(refId))?.slug ?? null;
      return null;
    };

    const hrefFor = async (item: MenuItem): Promise<string | null> => {
      if (item.type === "custom") return item.url;
      const slug = await slugByRefId(item.type, item.refId);
      if (!slug) return null;
      if (item.type === "post") return `/posts/${slug}`;
      if (item.type === "page") return `/${slug}`;
      return `/categories/${slug}`;
    };

    const byParent = new Map<string | null, MenuItem[]>();
    for (const item of items) {
      const list = byParent.get(item.parentId) ?? [];
      list.push(item);
      byParent.set(item.parentId, list);
    }
    const build = async (parentId: string | null): Promise<PublicNavLink[]> => {
      const children = (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
      const result: PublicNavLink[] = [];
      for (const child of children) {
        const href = await hrefFor(child);
        if (!href) continue;
        result.push({ id: child.id, label: child.label, href, children: await build(child.id) });
      }
      return result;
    };
    return build(null);
  };
}