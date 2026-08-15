"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";

const seoSchema = z.object({
  defaultMetaTitle: z.string().trim(),
  defaultMetaDescription: z.string().trim(),
});

export async function saveSeoDefaultsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = seoSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the SEO fields and try again.");
  }
  await content.updateSettings(parsed.data, session.sub);
  redirect("/admin/seo");
}

export async function regenerateSitemapAction(): Promise<void> {
  const session = await requireSession();
  await content.touchSitemap(session.sub);
  revalidatePath("/admin/seo");
  revalidatePath("/sitemap.xml");
}