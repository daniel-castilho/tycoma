import { prisma } from "@/shared/db/prisma";
import type {
  Category,
  CategoryRepository,
  ContentStatus,
  Menu,
  MenuItem,
  MenuRepository,
  Page,
  PageRepository,
  Post,
  PostRepository,
  SettingsRepository,
  Tag,
  TagRepository,
} from "../domain/types";

function asStatus(value: string): ContentStatus {
  if (value === "published" || value === "scheduled" || value === "draft") {
    return value;
  }
  return "draft";
}

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
  return { ...row, status: asStatus(row.status) };
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
  return { ...row, status: asStatus(row.status) };
}

export const prismaPostRepository: PostRepository = {
  async list(query) {
    const rows = await prisma.post.findMany({
      where: {
        status: query.status,
        categoryIds: query.categoryId ? { has: query.categoryId } : undefined,
        title: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
        updatedAt:
          query.from || query.to
            ? { gte: query.from, lte: query.to }
            : undefined,
      },
      orderBy: { [query.sort ?? "updatedAt"]: query.order ?? "desc" },
    });
    return rows.map(mapPost);
  },
  async findById(id) {
    const row = await prisma.post.findUnique({ where: { id } });
    return row ? mapPost(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.post.findUnique({ where: { slug } });
    return row ? mapPost(row) : null;
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return mapPost(await prisma.post.create({ data: rest }));
  },
  async update(id, data) {
    return mapPost(await prisma.post.update({ where: { id }, data }));
  },
  async deleteMany(ids) {
    const res = await prisma.post.deleteMany({ where: { id: { in: ids } } });
    return res.count;
  },
  async countByStatus() {
    const groups = await prisma.post.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(groups.map((g) => [g.status, g._count]));
  },
  async countByCategory(categoryId) {
    return prisma.post.count({ where: { categoryIds: { has: categoryId } } });
  },
  async countByTag(tagId) {
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
    const row = await prisma.page.findUnique({ where: { id } });
    return row ? mapPage(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.page.findUnique({ where: { slug } });
    return row ? mapPage(row) : null;
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return mapPage(await prisma.page.create({ data: rest }));
  },
  async update(id, data) {
    return mapPage(await prisma.page.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.page.delete({ where: { id } });
  },
  async countByStatus() {
    const groups = await prisma.page.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(groups.map((g) => [g.status, g._count]));
  },
  async idsUsingMedia(mediaId) {
    const rows = await prisma.page.findMany({
      where: {
        OR: [{ featuredImageId: mediaId }, { ogImageId: mediaId }],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  },
};

export const prismaCategoryRepository: CategoryRepository = {
  async list() {
    return prisma.category.findMany({ orderBy: { name: "asc" } }) as Promise<Category[]>;
  },
  async findById(id) {
    return prisma.category.findUnique({ where: { id } });
  },
  async findBySlug(slug) {
    return prisma.category.findUnique({ where: { slug } });
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return prisma.category.create({ data: rest });
  },
  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  },
  async delete(id) {
    await prisma.category.delete({ where: { id } });
  },
};

export const prismaTagRepository: TagRepository = {
  async list() {
    return prisma.tag.findMany({ orderBy: { name: "asc" } }) as Promise<Tag[]>;
  },
  async findById(id) {
    return prisma.tag.findUnique({ where: { id } });
  },
  async findBySlug(slug) {
    return prisma.tag.findUnique({ where: { slug } });
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return prisma.tag.create({ data: rest });
  },
  async update(id, data) {
    return prisma.tag.update({ where: { id }, data });
  },
  async delete(id) {
    await prisma.tag.delete({ where: { id } });
  },
};

export const prismaMenuRepository: MenuRepository = {
  async list() {
    return prisma.menu.findMany({ orderBy: { name: "asc" } }) as Promise<Menu[]>;
  },
  async findById(id) {
    return prisma.menu.findUnique({ where: { id } });
  },
  async create(data) {
    const { id: _id, ...rest } = data;
    return prisma.menu.create({ data: rest });
  },
  async update(id, data) {
    return prisma.menu.update({ where: { id }, data });
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
    return rows as MenuItem[];
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
