import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import { validateEntryFields } from "../../domain/content-type-fields";
import type {
  ContentEntry,
  ContentEntryReader,
  ContentEntryWriter,
  ContentEntryWrite,
  ContentType,
  ContentTypeReader,
  ContentTypeWriter,
  ContentTypeWrite,
  ListContentEntriesQuery,
} from "../../domain/content-types";

export function createListContentTypes(types: ContentTypeReader) {
  return async function listContentTypes(): Promise<ContentType[]> {
    return types.list();
  };
}

export function createGetContentType(types: ContentTypeReader) {
  return async function getContentType(id: string): Promise<ContentType | null> {
    return types.findById(id);
  };
}

export function createGetContentTypeBySlug(types: ContentTypeReader) {
  return async function getContentTypeBySlug(slug: string): Promise<ContentType | null> {
    return types.findBySlug(slug);
  };
}

export function createSaveContentType(
  types: ContentTypeReader & ContentTypeWriter,
  audit: AuditEventWriter,
) {
  return async function saveContentType(
    input: ContentTypeWrite & { id?: string },
    actorId?: string | null,
  ): Promise<Result<ContentType>> {
    const slug = slugify(input.slug);
    if (!slug) return err("A slug could not be generated.");
    const clash = await types.findBySlug(slug);
    if (clash && clash.id !== input.id) {
      return err("A content type with this slug already exists.");
    }
    const write: ContentTypeWrite = {
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      fields: input.fields,
    };
    if (input.id) {
      const saved = await types.update(input.id, write);
      await audit.record({
        actorId: actorId ?? null,
        eventType: "content.type_updated",
        entityType: "contentType",
        entityId: saved.id,
        details: JSON.stringify({ name: saved.name, slug: saved.slug }),
      });
      return ok(saved);
    }
    const saved = await types.create(write);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.type_created",
      entityType: "contentType",
      entityId: saved.id,
      details: JSON.stringify({ name: saved.name, slug: saved.slug }),
    });
    return ok(saved);
  };
}

export function createDeleteContentType(
  types: ContentTypeReader & ContentTypeWriter,
  audit: AuditEventWriter,
) {
  return async function deleteContentType(
    id: string,
    actorId?: string | null,
  ): Promise<Result<{ ok: true }>> {
    const type = await types.findById(id);
    if (!type) return err("Content type not found.");
    const count = await types.countEntries(id);
    if (count > 0) {
      return err("This content type still has entries. Delete them first.");
    }
    await types.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.type_deleted",
      entityType: "contentType",
      entityId: id,
      details: JSON.stringify({ name: type.name }),
    });
    return ok({ ok: true });
  };
}

export function createListEntries(entries: ContentEntryReader) {
  return async function listEntries(query: ListContentEntriesQuery): Promise<ContentEntry[]> {
    return entries.list(query);
  };
}

export function createGetEntry(entries: ContentEntryReader) {
  return async function getEntry(id: string): Promise<ContentEntry | null> {
    return entries.findById(id);
  };
}

export function createCreateEntry(
  entries: ContentEntryReader & ContentEntryWriter,
  types: ContentTypeReader,
  audit: AuditEventWriter,
) {
  return async function createEntry(
    input: ContentEntryWrite,
    actorId?: string | null,
  ): Promise<Result<ContentEntry>> {
    const type = await types.findById(input.contentTypeId);
    if (!type) return err("Content type not found.");
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    const existing = await entries.findBySlug(input.contentTypeId, slug);
    if (existing) return err("An entry with this slug already exists.");
    const { value, errors } = validateEntryFields(type, input.fields);
    if (errors.length > 0) {
      return err(errors.map((e) => e.message).join(" "));
    }
    const entry = await entries.create({
      contentTypeId: input.contentTypeId,
      slug,
      title: input.title.trim(),
      status: input.status,
      fields: value,
      publishedAt: input.publishedAt ?? null,
      scheduledAt: input.scheduledAt ?? null,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.entry_created",
      entityType: "contentEntry",
      entityId: entry.id,
      details: JSON.stringify({ title: entry.title, status: entry.status }),
    });
    return ok(entry);
  };
}

export function createUpdateEntry(
  entries: ContentEntryReader & ContentEntryWriter,
  types: ContentTypeReader,
  audit: AuditEventWriter,
) {
  return async function updateEntry(
    id: string,
    input: ContentEntryWrite,
    actorId?: string | null,
  ): Promise<Result<ContentEntry>> {
    const current = await entries.findById(id);
    if (!current) return err("Entry not found.");
    const type = await types.findById(input.contentTypeId);
    if (!type) return err("Content type not found.");
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    const clash = await entries.findBySlug(input.contentTypeId, slug);
    if (clash && clash.id !== id) return err("An entry with this slug already exists.");
    const { value, errors } = validateEntryFields(type, input.fields);
    if (errors.length > 0) {
      return err(errors.map((e) => e.message).join(" "));
    }
    const updated = await entries.update(id, {
      contentTypeId: input.contentTypeId,
      slug,
      title: input.title.trim(),
      status: input.status,
      fields: value,
      publishedAt: input.publishedAt ?? current.publishedAt,
      scheduledAt: input.scheduledAt ?? current.scheduledAt,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.entry_updated",
      entityType: "contentEntry",
      entityId: id,
      details: JSON.stringify({ title: updated.title, status: updated.status }),
    });
    return ok(updated);
  };
}

export function createPublishEntry(
  entries: ContentEntryReader & ContentEntryWriter,
  audit: AuditEventWriter,
) {
  return async function publishEntry(
    id: string,
    actorId?: string | null,
  ): Promise<Result<ContentEntry>> {
    const current = await entries.findById(id);
    if (!current) return err("Entry not found.");
    const updated = await entries.update(id, {
      status: "published",
      publishedAt: new Date(),
      scheduledAt: null,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.entry_published",
      entityType: "contentEntry",
      entityId: id,
      details: JSON.stringify({ title: updated.title }),
    });
    return ok(updated);
  };
}

export function createDeleteEntry(
  entries: ContentEntryReader & ContentEntryWriter,
  audit: AuditEventWriter,
) {
  return async function deleteEntry(
    id: string,
    actorId?: string | null,
  ): Promise<Result<{ ok: true }>> {
    const entry = await entries.findById(id);
    if (!entry) return err("Entry not found.");
    await entries.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.entry_deleted",
      entityType: "contentEntry",
      entityId: id,
      details: JSON.stringify({ title: entry.title }),
    });
    return ok({ ok: true });
  };
}

export function createListPublishedEntriesByTypeSlug(
  types: ContentTypeReader,
  entries: ContentEntryReader,
) {
  return async function listPublishedEntriesByTypeSlug(
    typeSlug: string,
  ): Promise<ContentEntry[] | null> {
    const type = await types.findBySlug(typeSlug);
    if (!type) return null;
    const list = await entries.list({ contentTypeId: type.id });
    return list
      .filter((e) => e.status === "published")
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  };
}

export function createGetPublishedEntryByTypeAndSlug(
  types: ContentTypeReader,
  entries: ContentEntryReader,
) {
  return async function getPublishedEntryByTypeAndSlug(
    typeSlug: string,
    entrySlug: string,
  ): Promise<ContentEntry | null> {
    const type = await types.findBySlug(typeSlug);
    if (!type) return null;
    const entry = await entries.findBySlug(type.id, entrySlug);
    return entry && entry.status === "published" ? entry : null;
  };
}