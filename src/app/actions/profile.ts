"use server";

import { revalidatePath } from "next/cache";
import { resolveLocale } from "@/i18n/locales";
import { changePasswordSchema, toFieldErrors } from "@/lib/validation";
import { changePassword } from "@/server/accounts";
import { getSessionToken, requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { limitWrites } from "@/server/rate-limit";
import type { FormState } from "./auth";
import { setLocaleAction } from "./preferences";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  if (!(await limitWrites(db, user.id)).ok) return { formError: "rateLimited" };
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const result = await changePassword(
    db,
    user.id,
    parsed.data.currentPassword,
    parsed.data.password,
    await getSessionToken(),
  );
  return result === "ok" ? { done: true } : { fieldErrors: { currentPassword: "wrongPassword" } };
}

export async function saveLanguageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await limitWrites(await getDb(), user.id)).ok) return { formError: "rateLimited" };
  await setLocaleAction(resolveLocale(String(formData.get("locale") ?? "")));
  revalidatePath("/", "layout");
  return { done: true };
}
