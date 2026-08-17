"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import type { PostActionState } from "../_lib/action-state";
import { requireSession } from "../_lib/session";

const status = z.preprocess(
  (value) => (value === "published" || value === "scheduled" ? value : "draft"),
  z.enum(["draft", "scheduled", "published"]),
);

const dateOrNull = z.preprocess(
  (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  },
  z.date().nullable(),
);

const nullableText = z.preprocess(
  (value) => (value === undefined || value === null ? "" : String(value)),
  z.string().transform((v) => v || null),
);

const optionalId = z.preprocess(
  (value) => (value === undefined || String(value).trim() === "" ? undefined : String(value)),
  z.string().optional(),
);

const postWriteSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "A title is required."),
  slug: z.string().trim().optional(),
  body: z.string(),
  status,
  publishedAt: dateOrNull,
  scheduledAt: dateOrNull,
  metaTitle: nullableText,
  metaDescription: nullableText,
});

const pageWriteSchema = postWriteSchema.extend({
  parentId: optionalId,
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "A name is required."),
  slug: z.string().trim().optional(),
  description: nullableText,
  parentId: optionalId,
});

const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "A name is required."),
  slug: z.string().trim().optional(),
  description: nullableText,
});

const idSchema = z.object({
  id: z.string().min(1),
});

function formId(formData: FormData): string | undefined {
  const parsed = idSchema.safeParse(formDataToObject(formData));
  return parsed.success ? parsed.data.id : undefined;
}

export async function savePostAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const session = await requireSession();
  const parsed = postWriteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { error: "Check the form fields and try again.", message: null };
  }
  const { id, ...write } = parsed.data;
  const result = id
    ? await content.updatePost(id, write, session.sub)
    : await content.createPost(write, session.sub);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/posts/${result.value.id}`);
}

export async function bulkPostsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("action") ?? "");
  if (action !== "delete" && action !== "publish") return;
  await content.bulkPosts({ ids, action, actorId: session.sub });
  redirect("/admin/posts");
}

export async function previewPostAction(formData: FormData): Promise<void> {
  const id = formId(formData);
  if (!id) return;
  const post = await content.getPost(id);
  if (!post) return;
  redirect(`/admin/posts/${id}/preview`);
}

export async function savePageAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const session = await requireSession();
  const parsed = pageWriteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { error: "Check the form fields and try again.", message: null };
  }
  const { id, ...write } = parsed.data;
  const result = id
    ? await content.updatePage(id, write, session.sub)
    : await content.createPage(write, session.sub);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/pages/${result.value.id}`);
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = formId(formData);
  if (!id) return;
  const result = await content.deletePage(id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/pages");
}

export async function previewPageAction(formData: FormData): Promise<void> {
  const id = formId(formData);
  if (!id) return;
  const page = await content.getPage(id);
  if (!page) return;
  redirect(`/admin/pages/${id}/preview`);
}

export async function saveCategoryAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = categorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the form fields and try again.");
  }
  const result = await content.saveCategory(parsed.data, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = formId(formData);
  if (!id) return;
  const result = await content.deleteCategory(id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function saveTagAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = tagSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the form fields and try again.");
  }
  const result = await content.saveTag(parsed.data, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = formId(formData);
  if (!id) return;
  const result = await content.deleteTag(id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}