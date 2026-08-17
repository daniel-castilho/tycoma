import { prisma } from "@/shared/db/prisma";
import { isObjectId } from "@/shared/kernel/object-id";
import { parseContentStatus } from "../domain/content-status";
import { containsMediaReference } from "../domain/media-reference";
import type {
  ContentEntry,
  ContentEntryRepository,
  ContentEntryWrite,
  ContentFieldType,
  ContentType,
  ContentTypeField,
  ContentTypeRepository,
  ContentTypeWrite,
  ListContentEntriesQuery,
} from "../domain/content-types";

const CONTENT_FIELD_TYPES: readonly string[] = ["text", "longtext", "number", "boolean", "date", "media"];

function parseContentTypeFields(value: unknown): ContentTypeField[] {
  if (!Array.isArray(value)) {
    throw new Error(`Unknown content-type fields in persistence: ${JSON.stringify(value)}`);
  }
  return value.map((field) => {
    const f = field as { name?: unknown; label?: unknown; type?: unknown; required?: unknown };
    if (
      typeof f?.name !== "string" ||
      typeof f?.label !== "string" ||
      typeof f?.type !== "string" ||
      !CONTENT_FIELD_TYPES.includes(f.type) ||
      typeof f?.required !== "boolean"
    ) {
      throw new Error(`Unknown content-type field in persistence: ${JSON.stringify(field)}`);
    }
    return {
      name: f.name,
      label: f.label,
      type: f.type as ContentFieldType,
      required: f.required,
    };
  });
}

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
    fields: parseContentTypeFields(row.fields),
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
  if (!row.fields || typeof row.fields !== "object" || Array.isArray(row.fields)) {
    throw new Error(`Unknown content-entry fields in persistence: ${JSON.stringify(row.fields)}`);
  }
  return {
    id: row.id,
    contentTypeId: row.contentTypeId,
    slug: row.slug,
    title: row.title,
    status: parseContentStatus(row.status),
    fields: row.fields as Record<string, unknown>,
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

/**
 * Scans every ContentEntry for occurrences of `mediaId` inside its JSON `fields`
 * payload and returns the matching entry ids. Only fields whose declared type is
 * a media kind are inspected (recursively inside the field value) — a text value
 * containing the same hex does not count. The `fields` column is stored as a
 * MongoDB Json, so the scan happens in JS — acceptable for a single-tenant CMS.
 */
export async function findEntryIdsUsingMedia(mediaId: string): Promise<string[]> {
  if (!isObjectId(mediaId)) return [];
  const [rows, types] = await Promise.all([
    prisma.contentEntry.findMany({ select: { id: true, contentTypeId: true, fields: true } }),
    prisma.contentType.findMany({ select: { id: true, fields: true } }),
  ]);
  const fieldDefsByType = new Map(
    types.map((type) => [
      type.id,
      (Array.isArray(type.fields) ? type.fields : []) as ContentTypeField[],
    ]),
  );
  return rows
    .filter((row) => {
      const fields = row.fields;
      if (!fields || typeof fields !== "object") return false;
      return containsMediaReference(
        fields as Record<string, unknown>,
        fieldDefsByType.get(row.contentTypeId) ?? [],
        mediaId,
      );
    })
    .map((row) => row.id);
}