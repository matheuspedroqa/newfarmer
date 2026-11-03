import "server-only";
import type { Locale, Theme } from "@/i18n/locales";
import type { Db } from "./db";

export async function setPreferences(db: Db, userId: number, prefs: { locale?: Locale; theme?: Theme }): Promise<void> {
  if (prefs.locale) await db.run("UPDATE users SET locale = $1 WHERE id = $2", [prefs.locale, userId]);
  if (prefs.theme) await db.run("UPDATE users SET theme = $1 WHERE id = $2", [prefs.theme, userId]);
}
