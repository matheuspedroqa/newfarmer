"use server";

import { resolveLocale, resolveTheme } from "@/i18n/locales";
import { LOCALE_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import { getCurrentUser, setPreferenceCookie } from "@/server/current-user";
import { getDb } from "@/server/db";
import { setPreferences } from "@/server/preferences";

export async function setLocaleAction(value: string): Promise<void> {
  const locale = resolveLocale(value);
  await setPreferenceCookie(LOCALE_COOKIE, locale);
  const user = await getCurrentUser();
  if (user) await setPreferences((await getDb()), user.id, { locale });
}

export async function setThemeAction(value: string): Promise<void> {
  const theme = resolveTheme(value);
  await setPreferenceCookie(THEME_COOKIE, theme);
  const user = await getCurrentUser();
  if (user) await setPreferences((await getDb()), user.id, { theme });
}
