import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type {
  ListPostsQuery,
  Post,
  PostReader,
  PostWrite,
  PostWriter,
} from "../../domain/types";
import { resolveStatus } from "../status";

export function createListPosts(posts: PostReader) {
  return async function listPosts(query: ListPostsQuery = {}): Promise<Post[]> {
    return posts.list(query);
  };
}

export function createGetPost(posts: PostReader) {
  return async function getPost(id: string): Promise<Post | null> {
    return posts.findById(id);
  };
}

export function createCreatePost(posts: PostReader & PostWriter, audit: AuditEventWriter) {
  return async function createPost(input: PostWrite, actorId?: string | null): Promise<Result<Post>> {
    const slug = slugify(input.slug || input.title);
    if (!slug) return err("A slug could not be generated from the title.");
    const existing = await posts.findBySlug(slug);
    if (existing) return err("A post with this slug already exists.");
    const status = resolveStatus(input);
    const now = new Date();
    const post = await posts.create({
      id: newObjectId(),
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
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.post_created",
      entityType: "post",
      entityId: post.id,
      details: JSON.stringify({ title: post.title, status: post.status }),
    });
    return ok(post);
  };
}

export function createUpdatePost(posts: PostReader & PostWriter, audit: AuditEventWriter) {
  return async function updatePost(
    id: string,
    input: PostWrite,
    actorId?: string | null,
  ): Promise<Result<Post>> {
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
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.post_updated",
      entityType: "post",
      entityId: id,
      details: JSON.stringify({ title: updated.title, status: updated.status }),
    });
    return ok(updated);
  };
}

export function createPublishPost(posts: PostReader & PostWriter, audit: AuditEventWriter) {
  return async function publishPost(id: string, actorId?: string | null): Promise<Result<Post>> {
    const current = await posts.findById(id);
    if (!current) return err("Post not found.");
    const updated = await posts.update(id, {
      status: "published",
      publishedAt: new Date(),
      scheduledAt: null,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.post_published",
      entityType: "post",
      entityId: id,
      details: JSON.stringify({ title: updated.title }),
    });
    return ok(updated);
  };
}

export function createBulkPosts(posts: PostReader & PostWriter, audit: AuditEventWriter) {
  const publishPost = createPublishPost(posts, audit);
  return async function bulkPosts(input: {
    ids: string[];
    action: "delete" | "publish";
    actorId?: string | null;
  }): Promise<Result<{ affected: number }>> {
    if (input.ids.length === 0) return ok({ affected: 0 });
    if (input.action === "delete") {
      const affected = await posts.deleteMany(input.ids);
      for (const id of input.ids) {
        await audit.record({
          actorId: input.actorId ?? null,
          eventType: "content.post_deleted",
          entityType: "post",
          entityId: id,
          details: null,
        });
      }
      return ok({ affected });
    }
    let affected = 0;
    for (const id of input.ids) {
      const result = await publishPost(id, input.actorId);
      if (result.ok) affected += 1;
    }
    return ok({ affected });
  };
}
