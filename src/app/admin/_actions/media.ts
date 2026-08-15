"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { media } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";

const metadataSchema = z.object({
  id: z.string().min(1),
  alt: z.string().transform((v) => v.trim() || null),
  caption: z.string().transform((v) => v.trim() || null),
});

const idSchema = z.object({
  id: z.string().min(1),
});

export async function saveMediaMetadataAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = metadataSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Media metadata is not valid.");
  }
  const result = await media.updateMediaMetadata(parsed.data.id, {
    alt: parsed.data.alt,
    caption: parsed.data.caption,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath(`/admin/media/${parsed.data.id}`);
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = idSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return;
  const result = await media.deleteMedia(parsed.data.id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/media");
}