import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type { ListPostsQuery, Post, PostRepository, PostWrite } from "../../domain/types";
import { resolveStatus } from "../status";

export function createListPosts(posts: PostRepository) {
  return async function listPosts(query: ListPostsQuery = {}): Promise<Post[]> {
    return posts.list(query);
  };
}

export function createGetPost(posts: PostRepository) {
  return async function getPost(id: string): Promise<Post | null> {
    return posts.findById(id);
  };
}

export function createCreatePost(posts: PostRepository) {
  return async function createPost(input: PostWrite): Promise<Result<Post>> {
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    const existing = await posts.findBySlug(slug);
    if (existing) return err("A post with this slug already exists.");
    const status = resolveStatus(input);
    const now = new Date();
    const post = await posts.create({
      id: randomUUID().replace(/-/g, "").slice(0, 24),
      title: input.title.trim(),
      slug,
      body: input.body,
      featuredImageId: input.featuredImageId ?? null,
      categoryIds: input.categoryIds ?? [],
      tagIds: input.tagIds ?? [],
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageId: input.ogImageId ?? null,
      createdAt: now,
      updatedAt: now,
      ...status,
    });
    return ok(post);
  };
}

export function createUpdatePost(posts: PostRepository) {
  return async function updatePost(id: string, input: PostWrite): Promise<Result<Post>> {
    const current = await posts.findById(id);
    if (!current) return err("Post not found.");
    const slug = slugify(input.slug || input.title);
    const clash = await posts.findBySlug(slug);
    if (clash && clash.id !== id) return err("A post with this slug already exists.");
    const status = resolveStatus(input);
    const updated = await posts.update(id, {
      title: input.title.trim(),
      slug,
      body: input.body,
      featuredImageId: input.featuredImageId ?? null,
      categoryIds: input.categoryIds ?? [],
      tagIds: input.tagIds ?? [],
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageId: input.ogImageId ?? null,
      ...status,
    });
    return ok(updated);
  };
}

export function createPublishPost(posts: PostRepository) {
  return async function publishPost(id: string): Promise<Result<Post>> {
    const current = await posts.findById(id);
    if (!current) return err("Post not found.");
    const updated = await posts.update(id, {
      status: "published",
      publishedAt: new Date(),
      scheduledAt: null,
    });
    return ok(updated);
  };
}

export function createBulkPosts(posts: PostRepository) {
  return async function bulkPosts(input: {
    ids: string[];
    action: "delete" | "publish";
  }): Promise<Result<{ affected: number }>> {
    if (input.ids.length === 0) return ok({ affected: 0 });
    if (input.action === "delete") {
      const affected = await posts.deleteMany(input.ids);
      return ok({ affected });
    }
    let affected = 0;
    for (const id of input.ids) {
      const result = await createPublishPost(posts)(id);
      if (result.ok) affected += 1;
    }
    return ok({ affected });
  };
}
