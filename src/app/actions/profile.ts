"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import { changePasswordSchema, toFieldErrors } from "@/lib/validation";
import { logWriteLimited } from "@/server/activity-log";
import { changePasswordLogged, deleteAccountLogged, saveLocaleLogged } from "@/server/audited";
import { LOCALE_COOKIE, SESSION_COOKIE } from "@/lib/cookies";
import { getSessionToken, requireUser, setPreferenceCookie } from "@/server/current-user";
import { getDb } from "@/server/db";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited" };
  }
  // Só requireUser().id: nenhum campo do formulário é lido como id de conta.
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const result = await changePasswordLogged(
    db,
    user,
    parsed.data.currentPassword,
    parsed.data.password,
    await getSessionToken(),
    ip,
  );
  return result === "ok" ? { done: true } : { fieldErrors: { currentPassword: "wrongPassword" } };
}

export async function saveLanguageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited" };
  }
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  await setPreferenceCookie(LOCALE_COOKIE, locale);
  await saveLocaleLogged(db, user.id, locale, ip);
  revalidatePath("/", "layout");
  return { done: true };
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited" };
  }
  if (formData.get("confirm") !== "on") return { fieldErrors: { confirm: "confirmRequired" } };
  const result = await deleteAccountLogged(db, user, String(formData.get("password") ?? ""), ip);
  if (result !== "ok") return { fieldErrors: { password: "wrongPassword" } };
  // As sessões já saíram do banco junto com a conta; falta só o cookie neste navegador.
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login?conta=apagada");
}
