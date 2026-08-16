import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { Page, PageReader, PageWrite, PageWriter } from "../../domain/types";
import { resolveStatus } from "../status";

export function createListPages(pages: PageReader) {
  return async function listPages(): Promise<Page[]> {
    return pages.list();
  };
}

export function createDeletePage(pages: PageReader & PageWriter, audit: AuditEventWriter) {
  return async function deletePage(id: string, actorId?: string | null): Promise<Result<{ ok: true }>> {
    const page = await pages.findById(id);
    if (!page) return err("Page not found.");
    const children = await pages.list();
    if (children.some((p) => p.parentId === id)) {
      return err("This page has child pages. Remove or re-parent them first.");
    }
    await pages.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.page_deleted",
      entityType: "page",
      entityId: id,
      details: JSON.stringify({ title: page.title }),
    });
    return ok({ ok: true });
  };
}

export function createGetPage(pages: PageReader) {
  return async function getPage(id: string): Promise<Page | null> {
    return pages.findById(id);
  };
}

export function createCreatePage(pages: PageWriter & PageReader) {
  return async function createPage(input: PageWrite): Promise<Result<Page>> {
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    if (await pages.findBySlug(slug)) return err("A page with this slug already exists.");
    if (input.parentId) {
      const parent = await pages.findById(input.parentId);
      if (!parent) return err("Parent page not found.");
    }
    const status = resolveStatus(input);
    const now = new Date();
    const page = await pages.create({
      id: newObjectId(),
      title: input.title.trim(),
      slug,
      body: input.body,
      parentId: input.parentId ?? null,
      featuredImageId: input.featuredImageId ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageId: input.ogImageId ?? null,
      createdAt: now,
      updatedAt: now,
      ...status,
    });
    return ok(page);
  };
}

export function createUpdatePage(pages: PageReader & PageWriter) {
  return async function updatePage(id: string, input: PageWrite): Promise<Result<Page>> {
    const current = await pages.findById(id);
    if (!current) return err("Page not found.");
    if (input.parentId === id) return err("A page cannot be its own parent.");
    const slug = slugify(input.slug || input.title);
    const clash = await pages.findBySlug(slug);
    if (clash && clash.id !== id) return err("A page with this slug already exists.");
    const status = resolveStatus(input);
    const updated = await pages.update(id, {
      title: input.title.trim(),
      slug,
      body: input.body,
      parentId: input.parentId ?? null,
      featuredImageId: input.featuredImageId ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageId: input.ogImageId ?? null,
      ...status,
    });
    return ok(updated);
  };
}
