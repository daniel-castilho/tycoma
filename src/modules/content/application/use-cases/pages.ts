import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { StepUpStore } from "@/modules/auth/domain/step-up";
import type { Page, PageReader, PageWrite, PageWriter } from "../../domain/types";
import { resolveStatus } from "../status";

export function createListPages(pages: PageReader) {
  return async function listPages(): Promise<Page[]> {
    return pages.list();
  };
}

export function createDeletePage(
  pages: PageReader & PageWriter,
  audit: AuditEventWriter,
  stepUp: StepUpStore,
) {
  return async function deletePage(
    id: string,
    actorId?: string | null,
  ): Promise<Result<{ ok: true }>> {
    // Phase C: destructive deletes require a recent step-up (Redis TTL 10 min,
    // time-boxed reuse — see `STEP_UP_TTL_SECONDS`).
    if (!(await stepUp.has(actorId ?? ""))) {
      return err("Please confirm your current password before this action.");
    }
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

export function createCreatePage(pages: PageWriter & PageReader, audit: AuditEventWriter) {
  return async function createPage(input: PageWrite, actorId?: string | null): Promise<Result<Page>> {
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    if (await pages.findBySlug(slug)) return err("A page with this slug already exists.");
    if (input.parentId) {
      const parent = await pages.findById(input.parentId);
      if (!parent) return err("Parent page not found.");
    }
    const status = resolveStatus(input);
    const page = await pages.create({
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
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.page_created",
      entityType: "page",
      entityId: page.id,
      details: JSON.stringify({ title: page.title, status: page.status }),
    });
    return ok(page);
  };
}

export function createUpdatePage(pages: PageReader & PageWriter, audit: AuditEventWriter) {
  return async function updatePage(
    id: string,
    input: PageWrite,
    actorId?: string | null,
  ): Promise<Result<Page>> {
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
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.page_updated",
      entityType: "page",
      entityId: id,
      details: JSON.stringify({ title: updated.title, status: updated.status }),
    });
    return ok(updated);
  };
}
