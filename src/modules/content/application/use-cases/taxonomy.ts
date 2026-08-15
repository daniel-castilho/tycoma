import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type {
  Category,
  CategoryRepository,
  PostRepository,
  Tag,
  TagRepository,
} from "../../domain/types";

const oid = () => randomUUID().replace(/-/g, "").slice(0, 24);

export function createListCategories(categories: CategoryRepository, posts: PostRepository) {
  return async function listCategories(): Promise<(Category & { postCount: number })[]> {
    const list = await categories.list();
    return Promise.all(
      list.map(async (c) => ({ ...c, postCount: await posts.countByCategory(c.id) })),
    );
  };
}

export function createSaveCategory(categories: CategoryRepository) {
  return async function saveCategory(input: {
    id?: string;
    name: string;
    slug?: string;
    description?: string | null;
    parentId?: string | null;
  }): Promise<Result<Category>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    const clash = await categories.findBySlug(slug);
    if (clash && clash.id !== input.id) return err("A category with this slug already exists.");
    if (input.id) {
      return ok(
        await categories.update(input.id, {
          name: input.name.trim(),
          slug,
          description: input.description ?? null,
          parentId: input.parentId ?? null,
        }),
      );
    }
    return ok(
      await categories.create({
        id: oid(),
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
      }),
    );
  };
}

export function createDeleteCategory(categories: CategoryRepository, posts: PostRepository) {
  return async function deleteCategory(id: string): Promise<Result<{ ok: true }>> {
    const count = await posts.countByCategory(id);
    if (count > 0) return err("Cannot delete a category that is still used by posts.");
    await categories.delete(id);
    return ok({ ok: true });
  };
}

export function createListTags(tags: TagRepository, posts: PostRepository) {
  return async function listTags(): Promise<(Tag & { postCount: number })[]> {
    const list = await tags.list();
    return Promise.all(list.map(async (t) => ({ ...t, postCount: await posts.countByTag(t.id) })));
  };
}

export function createSaveTag(tags: TagRepository) {
  return async function saveTag(input: {
    id?: string;
    name: string;
    slug?: string;
    description?: string | null;
  }): Promise<Result<Tag>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    const clash = await tags.findBySlug(slug);
    if (clash && clash.id !== input.id) return err("A tag with this slug already exists.");
    if (input.id) {
      return ok(
        await tags.update(input.id, {
          name: input.name.trim(),
          slug,
          description: input.description ?? null,
        }),
      );
    }
    return ok(
      await tags.create({
        id: oid(),
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
      }),
    );
  };
}

export function createDeleteTag(tags: TagRepository, posts: PostRepository) {
  return async function deleteTag(id: string): Promise<Result<{ ok: true }>> {
    const count = await posts.countByTag(id);
    if (count > 0) return err("Cannot delete a tag that is still used by posts.");
    await tags.delete(id);
    return ok({ ok: true });
  };
}
