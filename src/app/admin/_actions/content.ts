"use server";

import { redirect } from "next/navigation";
import {
  bulkPosts,
  createPage,
  createPost,
  deleteCategory,
  deletePage,
  deleteTag,
  getPage,
  getPost,
  saveCategory,
  saveTag,
  updatePage,
  updatePost,
} from "@/modules/content/application";
import type { ContentStatus, PageWrite, PostWrite } from "@/modules/content/domain/types";

export type PostActionState = { error: string | null; message: string | null };
export const emptyPostState: PostActionState = { error: null, message: null };

function readForm(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function readOptionalDate(formData: FormData, name: string): Date | null | undefined {
  const raw = readForm(formData, name).trim();
  if (raw === "") return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function readWrite(formData: FormData): PostWrite {
  const statusRaw = readForm(formData, "status");
  const status: ContentStatus =
    statusRaw === "published" || statusRaw === "scheduled" ? statusRaw : "draft";

  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const publishedAt = readOptionalDate(formData, "publishedAt");

  return {
    title: readForm(formData, "title"),
    slug: readForm(formData, "slug") || undefined,
    body: readForm(formData, "body"),
    status,
    publishedAt,
    scheduledAt,
    metaTitle: readForm(formData, "metaTitle") || null,
    metaDescription: readForm(formData, "metaDescription") || null,
  };
}

export async function savePostAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const id = readForm(formData, "id");
  const write = readWrite(formData);
  const result = id ? await updatePost(id, write) : await createPost(write);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/posts/${result.value.id}`);
}

export async function bulkPostsAction(formData: FormData): Promise<void> {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("action") ?? "");
  if (action !== "delete" && action !== "publish") return;
  await bulkPosts({ ids, action });
  redirect("/admin/posts");
}

export async function previewPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const post = await getPost(id);
  if (!post) return;
  redirect(`/admin/posts/${id}/preview`);
}

function readPageWrite(formData: FormData): PageWrite {
  const statusRaw = readForm(formData, "status");
  const status: ContentStatus =
    statusRaw === "published" || statusRaw === "scheduled" ? statusRaw : "draft";
  const parentId = readForm(formData, "parentId") || null;
  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const publishedAt = readOptionalDate(formData, "publishedAt");
  return {
    title: readForm(formData, "title"),
    slug: readForm(formData, "slug") || undefined,
    body: readForm(formData, "body"),
    status,
    parentId: parentId || undefined,
    publishedAt,
    scheduledAt,
    metaTitle: readForm(formData, "metaTitle") || null,
    metaDescription: readForm(formData, "metaDescription") || null,
  };
}

export async function savePageAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const id = readForm(formData, "id");
  const write = readPageWrite(formData);
  const result = id ? await updatePage(id, write) : await createPage(write);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/pages/${result.value.id}`);
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deletePage(id);
  redirect("/admin/pages");
}

export async function previewPageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const page = await getPage(id);
  if (!page) return;
  redirect(`/admin/pages/${id}/preview`);
}

export async function saveCategoryAction(formData: FormData): Promise<void> {
  const id = readForm(formData, "id") || undefined;
  const name = readForm(formData, "name");
  const slug = readForm(formData, "slug") || undefined;
  const description = readForm(formData, "description") || null;
  const parentId = readForm(formData, "parentId") || null;
  const result = await saveCategory({ id, name, slug, description, parentId });
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await deleteCategory(id);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function saveTagAction(formData: FormData): Promise<void> {
  const id = readForm(formData, "id") || undefined;
  const name = readForm(formData, "name");
  const slug = readForm(formData, "slug") || undefined;
  const description = readForm(formData, "description") || null;
  const result = await saveTag({ id, name, slug, description });
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await deleteTag(id);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/taxonomy");
}
