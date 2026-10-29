"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import { changePasswordSchema, toFieldErrors } from "@/lib/validation";
import { changePassword } from "@/server/accounts";
import { getCurrentUser, getSessionToken } from "@/server/current-user";
import { getDb } from "@/server/db";
import type { FormState } from "./auth";
import { setLocaleAction } from "./preferences";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const result = await changePassword(
    getDb(),
    user.id,
    parsed.data.currentPassword,
    parsed.data.password,
    await getSessionToken(),
  );
  return result === "ok" ? { done: true } : { fieldErrors: { currentPassword: "wrongPassword" } };
}

export async function saveLanguageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await setLocaleAction(resolveLocale(String(formData.get("locale") ?? "")));
  revalidatePath("/", "layout");
  return { done: true };
}
