import { prisma } from "@/shared/db/prisma";
import { isObjectId } from "@/shared/db/object-id";
import { parseContentStatus } from "../domain/content-status";
import type {
  ContentEntry,
  ContentEntryRepository,
  ContentEntryWrite,
  ContentType,
  ContentTypeField,
  ContentTypeRepository,
  ContentTypeWrite,
  ListContentEntriesQuery,
} from "../domain/content-types";

function mapContentType(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ContentType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    fields: (Array.isArray(row.fields) ? row.fields : []) as ContentTypeField[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapContentEntry(row: {
  id: string;
  contentTypeId: string;
  slug: string;
  title: string;
  status: string;
  fields: unknown;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ContentEntry {
  return {
    id: row.id,
    contentTypeId: row.contentTypeId,
    slug: row.slug,
    title: row.title,
    status: parseContentStatus(row.status),
    fields: (row.fields && typeof row.fields === "object" ? row.fields : {}) as Record<
      string,
      unknown
    >,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const prismaContentTypeRepository: ContentTypeRepository = {
  async list() {
    const rows = await prisma.contentType.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapContentType);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.contentType.findUnique({ where: { id } });
    return row ? mapContentType(row) : null;
  },
  async findBySlug(slug) {
    const row = await prisma.contentType.findUnique({ where: { slug } });
    return row ? mapContentType(row) : null;
  },
  async create(data: ContentTypeWrite) {
    return mapContentType(
      await prisma.contentType.create({
        data: { ...data, fields: data.fields as object },
      }),
    );
  },
  async update(id, data) {
    return mapContentType(
      await prisma.contentType.update({
        where: { id },
        data: { ...data, fields: data.fields ? (data.fields as object) : undefined },
      }),
    );
  },
  async delete(id) {
    await prisma.contentType.delete({ where: { id } });
  },
  async countEntries(contentTypeId) {
    return prisma.contentEntry.count({ where: { contentTypeId } });
  },
};

export const prismaContentEntryRepository: ContentEntryRepository = {
  async list(query: ListContentEntriesQuery) {
    const rows = await prisma.contentEntry.findMany({
      where: {
        contentTypeId: isObjectId(query.contentTypeId) ? query.contentTypeId : undefined,
        status: query.status,
        title: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapContentEntry);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.contentEntry.findUnique({ where: { id } });
    return row ? mapContentEntry(row) : null;
  },
  async findBySlug(contentTypeId, slug) {
    if (!isObjectId(contentTypeId)) return null;
    const row = await prisma.contentEntry.findFirst({
      where: { contentTypeId, slug },
    });
    return row ? mapContentEntry(row) : null;
  },
  async create(data: ContentEntryWrite) {
    return mapContentEntry(
      await prisma.contentEntry.create({
        data: { ...data, fields: data.fields as object },
      }),
    );
  },
  async update(id, data) {
    return mapContentEntry(
      await prisma.contentEntry.update({
        where: { id },
        data: { ...data, fields: data.fields ? (data.fields as object) : undefined },
      }),
    );
  },
  async delete(id) {
    await prisma.contentEntry.delete({ where: { id } });
  },
};