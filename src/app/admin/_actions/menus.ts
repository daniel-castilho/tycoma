"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";

const menuSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "A menu name is required."),
});

const idSchema = z.object({
  id: z.string().min(1),
});

export async function saveMenuAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = menuSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("A menu name is required.");
  }
  const result = await content.saveMenu(parsed.data, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect(parsed.data.id ? `/admin/menus/${parsed.data.id}` : `/admin/menus/${result.value.id}`);
}

export async function deleteMenuAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = idSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return;
  const result = await content.deleteMenu(parsed.data.id, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  redirect("/admin/menus");
}

const menuItemSchema: z.ZodType<{
  label: string;
  type: "post" | "page" | "category" | "custom";
  refId: string | null;
  url: string | null;
  sortOrder: number;
  children: z.infer<typeof menuItemSchema>[];
}> = z.lazy(() =>
  z.object({
    label: z.string().trim().min(1),
    type: z.enum(["post", "page", "category", "custom"]),
    refId: z.string().nullable(),
    url: z.string().nullable(),
    sortOrder: z.number().int().min(0),
    children: z.array(z.lazy(() => menuItemSchema)),
  }),
);

export async function saveMenuItemsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const menuId = String(formData.get("menuId") ?? "");
  const raw = String(formData.get("items") ?? "");
  if (!menuId) return;
  const parsed = menuItemSchema.array().safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("Menu items are not valid.");
  }
  const result = await content.saveMenuItems(menuId, parsed.data, session.sub);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath(`/admin/menus/${menuId}`);
}