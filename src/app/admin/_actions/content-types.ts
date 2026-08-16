"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";
import { isContentFieldType } from "@/modules/content/domain/content-type-fields";
import type { PostActionState } from "../_lib/action-state";

const fieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Field name is required.")
    .regex(/^[a-z][a-z0-9_]*$/, "Use a lowercase name like feature_notes."),
  label: z.string().trim().min(1, "Field label is required."),
  type: z
    .string()
    .refine(isContentFieldType, "Unsupported field type."),
  required: z.preprocess(
    (value) => value === "on" || value === "true",
    z.boolean(),
  ),
});

const contentTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "A name is required."),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const entrySchema = z.object({
  id: z.string().optional(),
  contentTypeId: z.string().min(1),
  title: z.string().trim().min(1, "A title is required."),
  slug: z.string().trim().optional(),
  status: z.preprocess(
    (value) => (value === "published" || value === "scheduled" ? value : "draft"),
    z.enum(["draft", "scheduled", "published"]),
  ),
  publishedAt: z.preprocess(
    (value) => {
      if (value === undefined || value === null || String(value).trim() === "") return null;
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    },
    z.date().nullable(),
  ),
  scheduledAt: z.preprocess(
    (value) => {
      if (value === undefined || value === null || String(value).trim() === "") return null;
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    },
    z.date().nullable(),
  ),
});

function idFrom(formData: FormData): string | undefined {
  const value = String(formData.get("id") ?? "");
  return value.trim() === "" ? undefined : value;
}

export async function saveContentTypeAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const session = await requireSession();
  const base = contentTypeSchema.safeParse(formDataToObject(formData));
  if (!base.success) {
    return { error: "Check the form fields and try again.", message: null };
  }

  const names = formData.getAll("fieldName").map(String);
  const labels = formData.getAll("fieldLabel").map(String);
  const types = formData.getAll("fieldType").map(String);
  const required = formData.getAll("fieldRequired").map(String);
  const fields: { name: string; label: string; type: string; required: boolean }[] = [];
  for (let i = 0; i < names.length; i++) {
    const parsed = fieldSchema.safeParse({
      name: names[i],
      label: labels[i],
      type: types[i],
      required: required[i] ?? "",
    });
    if (!parsed.success) {
      return { error: "Check the field list and try again.", message: null };
    }
    fields.push(parsed.data);
  }
  if (fields.length === 0) {
    return { error: "Add at least one field.", message: null };
  }

  const result = await content.saveContentType(
    {
      id: base.data.id,
      name: base.data.name,
      slug: base.data.slug,
      description: base.data.description || null,
      fields,
    },
    session.sub,
  );
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/content-types/${result.value.id}`);
}

export async function deleteContentTypeAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = idFrom(formData);
  if (!id) return;
  const result = await content.deleteContentType(id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/content-types");
}

export async function saveContentEntryAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const session = await requireSession();
  const parsed = entrySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { error: "Check the form fields and try again.", message: null };
  }
  const type = await content.getContentType(parsed.data.contentTypeId);
  if (!type) return { error: "Content type not found.", message: null };

  const fields: Record<string, unknown> = {};
  for (const field of type.fields) {
    const raw = formData.get(`field_${field.name}`);
    if (raw === null) continue;
    fields[field.name] = raw;
  }

  const { id, ...write } = parsed.data;
  const result = id
    ? await content.updateEntry(id, { ...write, fields }, session.sub)
    : await content.createEntry({ ...write, fields }, session.sub);
  if (!result.ok) {
    return { error: result.error, message: null };
  }
  redirect(`/admin/content-types/${result.value.contentTypeId}/entries/${result.value.id}`);
}

export async function publishContentEntryAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = idFrom(formData);
  const contentTypeId = String(formData.get("contentTypeId") ?? "");
  if (!id || !contentTypeId) return;
  await content.publishEntry(id, session.sub);
  redirect(`/admin/content-types/${contentTypeId}/entries`);
}

export async function deleteContentEntryAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = idFrom(formData);
  const contentTypeId = String(formData.get("contentTypeId") ?? "");
  if (!id || !contentTypeId) return;
  const result = await content.deleteEntry(id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect(`/admin/content-types/${contentTypeId}/entries`);
}