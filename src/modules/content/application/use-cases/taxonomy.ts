import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type {
  Category,
  CategoryRepository,
  PostReader,
  Tag,
  TagRepository,
} from "../../domain/types";

export function createListCategories(categories: CategoryRepository, posts: PostReader) {
  return async function listCategories(): Promise<(Category & { postCount: number })[]> {
    const list = await categories.list();
    return Promise.all(
      list.map(async (c) => ({ ...c, postCount: await posts.countByCategory(c.id) })),
    );
  };
}

export function createSaveCategory(categories: CategoryRepository, audit: AuditEventWriter) {
  return async function saveCategory(
    input: {
      id?: string;
      name: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
    },
    actorId?: string | null,
  ): Promise<Result<Category>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    const clash = await categories.findBySlug(slug);
    if (clash && clash.id !== input.id) return err("A category with this slug already exists.");

    const parentId = input.parentId ?? null;
    if (parentId && input.id && parentId === input.id) {
      return err("A category cannot be its own parent.");
    }
    if (parentId && input.id) {
      const all = await categories.list();
      // Reject a cycle: the chosen parent must not be (a descendant of) the category itself.
      const byId = new Map(all.map((c) => [c.id, c]));
      let current = byId.get(parentId);
      const guard = new Set<string>();
      while (current && !guard.has(current.id)) {
        if (current.id === input.id) {
          return err("A category cannot be nested under one of its own descendants.");
        }
        guard.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }

    if (input.id) {
      const updated = await categories.update(input.id, {
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        parentId,
      });
      await audit.record({
        actorId: actorId ?? null,
        eventType: "content.category_updated",
        entityType: "category",
        entityId: input.id,
        details: JSON.stringify({ name: updated.name }),
      });
      return ok(updated);
    }
    const created = await categories.create({
      id: newObjectId(),
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      parentId,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.category_created",
      entityType: "category",
      entityId: created.id,
      details: JSON.stringify({ name: created.name }),
    });
    return ok(created);
  };
}

export function createDeleteCategory(
  categories: CategoryRepository,
  posts: PostReader,
  audit: AuditEventWriter,
) {
  return async function deleteCategory(id: string, actorId?: string | null): Promise<Result<{ ok: true }>> {
    const count = await posts.countByCategory(id);
    if (count > 0) return err("Cannot delete a category that is still used by posts.");
    const category = await categories.findById(id);
    await categories.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.category_deleted",
      entityType: "category",
      entityId: id,
      details: category ? JSON.stringify({ name: category.name }) : null,
    });
    return ok({ ok: true });
  };
}

export function createListTags(tags: TagRepository, posts: PostReader) {
  return async function listTags(): Promise<(Tag & { postCount: number })[]> {
    const list = await tags.list();
    return Promise.all(list.map(async (t) => ({ ...t, postCount: await posts.countByTag(t.id) })));
  };
}

export function createSaveTag(tags: TagRepository, audit: AuditEventWriter) {
  return async function saveTag(
    input: {
      id?: string;
      name: string;
      slug?: string;
      description?: string | null;
    },
    actorId?: string | null,
  ): Promise<Result<Tag>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    const clash = await tags.findBySlug(slug);
    if (clash && clash.id !== input.id) return err("A tag with this slug already exists.");
    if (input.id) {
      const updated = await tags.update(input.id, {
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
      });
      await audit.record({
        actorId: actorId ?? null,
        eventType: "content.tag_updated",
        entityType: "tag",
        entityId: input.id,
        details: JSON.stringify({ name: updated.name }),
      });
      return ok(updated);
    }
    const created = await tags.create({
      id: newObjectId(),
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.tag_created",
      entityType: "tag",
      entityId: created.id,
      details: JSON.stringify({ name: created.name }),
    });
    return ok(created);
  };
}

export function createDeleteTag(
  tags: TagRepository,
  posts: PostReader,
  audit: AuditEventWriter,
) {
  return async function deleteTag(id: string, actorId?: string | null): Promise<Result<{ ok: true }>> {
    const count = await posts.countByTag(id);
    if (count > 0) return err("Cannot delete a tag that is still used by posts.");
    const tag = await tags.findById(id);
    await tags.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.tag_deleted",
      entityType: "tag",
      entityId: id,
      details: tag ? JSON.stringify({ name: tag.name }) : null,
    });
    return ok({ ok: true });
  };
}
