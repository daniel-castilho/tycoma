import { prisma } from "@/shared/db/prisma";
import { isObjectId } from "@/shared/kernel/object-id";
import { parseContentStatus } from "../domain/content-status";
import { POST_LIST_DEFAULT_ORDER, POST_LIST_DEFAULT_SORT } from "../domain/policies";
import type {
  Category,
  CategoryRepository,
  Menu,
  MenuItem,
  MenuItemType,
  MenuRepository,
  Page,
  PageRepository,
  PageWrite,
  Post,
  PostRepository,
  PostWrite,
  SettingsRepository,
  Tag,
  TagRepository,
} from "../domain/types";

function mapPost(row: {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  featuredImageId: string | null;
  categoryIds: string[];
  tagIds: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Post {
  return { ...row, status: parseContentStatus(row.status) };
}

function mapPage(row: {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: string;
  parentId: string | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  featuredImageId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Page {
  return { ...row, status: parseContentStatus(row.status) };
}

export const prismaPostRepository: PostRepository = {
  async list(query) {
    const rows = await prisma.post.findMany({
      where: {
        status: query.status,
        categoryIds: isObjectId(query.categoryId) ? { has: query.categoryId } : undefined,
        tagIds: isObjectId(query.tagId) ? { has: query.tagId } : undefined,
        title: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
        updatedAt:
          query.from || query.to
            ? { gte: query.from, lte: query.to }
            : undefined,
      },
      orderBy: { [query.sort ?? POST_LIST_DEFAULT_SORT]: query.order ?? POST_LIST_DEFAULT_ORDER },
    });
    return rows.map(mapPost);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.post.findUnique({ where: { id } });
    return row ? mapPost(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.post.findUnique({ where: { slug } });
    return row ? mapPost(row) : null;
  },
  async create(data: PostWrite) {
    return mapPost(
      await prisma.post.create({
        data: {
          title: data.title,
          slug: data.slug ?? "",
          body: data.body,
          status: data.status,
          publishedAt: data.publishedAt ?? null,
          scheduledAt: data.scheduledAt ?? null,
          featuredImageId: data.featuredImageId ?? null,
          categoryIds: data.categoryIds ?? [],
          tagIds: data.tagIds ?? [],
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
          ogImageId: data.ogImageId ?? null,
        },
      }),
    );
  },
  async update(id, data) {
    return mapPost(await prisma.post.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.post.delete({ where: { id } });
  },
  async deleteMany(ids) {
    const validIds = ids.filter(isObjectId);
    if (validIds.length === 0) return 0;
    const res = await prisma.post.deleteMany({ where: { id: { in: validIds } } });
    return res.count;
  },
  async countByStatus() {
    const groups = await prisma.post.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(groups.map((g) => [parseContentStatus(g.status), g._count]));
  },
  async countByCategory(categoryId) {
    if (!isObjectId(categoryId)) return 0;
    return prisma.post.count({ where: { categoryIds: { has: categoryId } } });
  },
  async countByTag(tagId) {
    if (!isObjectId(tagId)) return 0;
    return prisma.post.count({ where: { tagIds: { has: tagId } } });
  },
  async latestUpdated(limit) {
    const rows = await prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map(mapPost);
  },
  async idsUsingMedia(mediaId) {
    if (!isObjectId(mediaId)) return [];
    const rows = await prisma.post.findMany({
      where: {
        OR: [{ featuredImageId: mediaId }, { ogImageId: mediaId }],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  },
};

export const prismaPageRepository: PageRepository = {
  async list() {
    const rows = await prisma.page.findMany({ orderBy: { title: "asc" } });
    return rows.map(mapPage);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.page.findUnique({ where: { id } });
    return row ? mapPage(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.page.findUnique({ where: { slug } });
    return row ? mapPage(row) : null;
  },
  async create(data: PageWrite) {
    return mapPage(
      await prisma.page.create({
        data: {
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
        },
      }),
    );
  },
  async update(id, data) {
    return mapPage(await prisma.page.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.page.delete({ where: { id } });
  },
  async countByStatus() {
    const groups = await prisma.page.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(groups.map((g) => [parseContentStatus(g.status), g._count]));
  },
  async idsUsingMedia(mediaId) {
    if (!isObjectId(mediaId)) return [];
    const rows = await prisma.page.findMany({
      where: {
        OR: [{ featuredImageId: mediaId }, { ogImageId: mediaId }],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  },
};

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parentId,
  };
}

function mapTag(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  };
}

function mapMenu(row: { id: string; name: string; slug: string }): Menu {
  return { id: row.id, name: row.name, slug: row.slug };
}

const MENU_ITEM_TYPES: readonly MenuItemType[] = ["post", "page", "category", "custom"];

function parseMenuItemType(value: string): MenuItemType {
  if ((MENU_ITEM_TYPES as readonly string[]).includes(value)) {
    return value as MenuItemType;
  }
  throw new Error(`Unknown menu item type in persistence: ${JSON.stringify(value)}`);
}

function mapMenuItem(row: {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  type: string;
  refId: string | null;
  url: string | null;
  sortOrder: number;
}): MenuItem {
  return {
    id: row.id,
    menuId: row.menuId,
    parentId: row.parentId,
    label: row.label,
    type: parseMenuItemType(row.type),
    refId: row.refId,
    url: row.url,
    sortOrder: row.sortOrder,
  };
}

export const prismaCategoryRepository: CategoryRepository = {
  async list() {
    const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapCategory);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.category.findUnique({ where: { id } });
    return row ? mapCategory(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.category.findUnique({ where: { slug } });
    return row ? mapCategory(row) : null;
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return mapCategory(await prisma.category.create({ data: rest }));
  },
  async update(id, data) {
    return mapCategory(await prisma.category.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.category.delete({ where: { id } });
  },
};

export const prismaTagRepository: TagRepository = {
  async list() {
    const rows = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapTag);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.tag.findUnique({ where: { id } });
    return row ? mapTag(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.tag.findUnique({ where: { slug } });
    return row ? mapTag(row) : null;
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return mapTag(await prisma.tag.create({ data: rest }));
  },
  async update(id, data) {
    return mapTag(await prisma.tag.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.tag.delete({ where: { id } });
  },
};

export const prismaMenuRepository: MenuRepository = {
  async list() {
    const rows = await prisma.menu.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapMenu);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.menu.findUnique({ where: { id } });
    return row ? mapMenu(row) : null;
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return mapMenu(await prisma.menu.create({ data: rest }));
  },
  async update(id, data) {
    return mapMenu(await prisma.menu.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.menuItem.deleteMany({ where: { menuId: id } });
    await prisma.menu.delete({ where: { id } });
  },
  async listItems(menuId) {
    const rows = await prisma.menuItem.findMany({
      where: { menuId },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(mapMenuItem);
  },
  async replaceItems(menuId, items) {
    await prisma.menuItem.deleteMany({ where: { menuId } });
    if (items.length === 0) return;
    await prisma.menuItem.createMany({
      data: items.map(({ id: _id, ...rest }) => rest),
    });
  },
};

export const prismaSettingsRepository: SettingsRepository = {
  async getAll() {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  async setMany(entries) {
    await Promise.all(
      Object.entries(entries).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  },
};
