"use server";

import { revalidatePath } from "next/cache";
import { resolveLocale } from "@/i18n/locales";
import { changePasswordSchema, toFieldErrors } from "@/lib/validation";
import { changePassword } from "@/server/accounts";
import { logSafely, logWriteLimited } from "@/server/activity-log";
import { getSessionToken, requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";
import { setLocaleAction } from "./preferences";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  if (!(await limitWrites(db, user.id)).ok) {
    await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited" };
  }
  // Só requireUser().id: nenhum campo do formulário é lido como id de conta.
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
  if (result === "ok") await logSafely(db, { userId: user.id, action: "auth.passwordChanged", target: user.username, ip });
  return result === "ok" ? { done: true } : { fieldErrors: { currentPassword: "wrongPassword" } };
}

export async function saveLanguageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  if (!(await limitWrites(db, user.id)).ok) {
    await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited" };
  }
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  await setLocaleAction(locale);
  await logSafely(db, { userId: user.id, action: "profile.updated", details: { field: "locale", value: locale }, ip });
  revalidatePath("/", "layout");
  return { done: true };
}
