import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { StepUpStore } from "@/modules/auth/domain/step-up";
import type {
  ListPostsQuery,
  Post,
  PostReader,
  PostRepository,
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
    const post = await posts.create({
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

export function createDeletePost(
  posts: PostRepository,
  audit: AuditEventWriter,
  stepUp: StepUpStore,
) {
  return async function deletePost(
    id: string,
    actorId?: string | null,
  ): Promise<Result<{ ok: true }>> {
    // Phase C: destructive deletes require a recent step-up (Redis TTL 10 min,
    // time-boxed reuse — see `STEP_UP_TTL_SECONDS` in `auth/application/use-cases/step-up.ts`).
    if (!(await stepUp.has(actorId ?? ""))) {
      return err("Please confirm your current password before this action.");
    }
    const post = await posts.findById(id);
    if (!post) return err("Post not found.");
    await posts.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.post_deleted",
      entityType: "post",
      entityId: id,
      details: JSON.stringify({ title: post.title }),
    });
    return ok({ ok: true });
  };
}

export function createBulkPosts(
  posts: PostRepository,
  audit: AuditEventWriter,
  stepUp: StepUpStore,
) {
  const publishPost = createPublishPost(posts, audit);
  return async function bulkPosts(input: {
    ids: string[];
    action: "delete" | "publish";
    actorId?: string | null;
  }): Promise<Result<{ affected: number }>> {
    if (input.ids.length === 0) return ok({ affected: 0 });
    if (input.action === "delete") {
      // Phase C: bulk deletes are gated on the same step-up as single deletes
      // — leaving bulk ungated would let the step-up be bypassed.
      if (!(await stepUp.has(input.actorId ?? ""))) {
        return err("Please confirm your current password before this action.");
      }
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
