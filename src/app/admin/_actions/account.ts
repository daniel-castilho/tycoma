"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/app/_lib/modules";
import { formDataToObject } from "../_lib/form";
import { requireSession } from "../_lib/session";

const profileSchema = z.object({
  name: z.string().trim().min(1, "A name is required."),
  email: z.string().trim().email("Enter a valid email."),
  avatarMediaId: z.string().transform((v) => v.trim() || null),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmPassword: z.string().min(8),
});

const stepUpSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
});

export async function saveProfileAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = profileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the profile fields and try again.");
  }
  const result = await auth.updateProfile({
    userId: session.sub,
    ...parsed.data,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath("/admin/account");
}

/**
 * Phase B step-up: confirms the admin's current password and grants a
 * 10-minute Redis-backed marker. The change-password form is split into
 * two steps: the admin posts the current password here first, then the
 * actual change-password action runs.
 */
export async function stepUpAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = stepUpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Enter your current password.");
  }
  const result = await auth.stepUp({
    userId: session.sub,
    currentPassword: parsed.data.currentPassword,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath("/admin/account");
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error("Check the password fields and try again.");
  }
  const result = await auth.changePassword({
    userId: session.sub,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    confirmPassword: parsed.data.confirmPassword,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath("/admin/account");
}