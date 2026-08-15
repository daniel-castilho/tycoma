"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";

const settingsSchema = z.object({
  title: z.string().trim().min(1, "A title is required."),
  description: z.string().trim(),
  logoMediaId: z.string().transform((v) => v.trim() || null),
  faviconMediaId: z.string().transform((v) => v.trim() || null),
  timezone: z.string().trim().min(1).default("UTC"),
  baseUrl: z.string().trim(),
  defaultMetaTitle: z.string().trim(),
  defaultMetaDescription: z.string().trim(),
});

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the settings fields and try again.");
  }
  await content.updateSettings(parsed.data, session.sub);
  redirect("/admin/settings");
}