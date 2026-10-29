import type { Locale, Theme } from "@/i18n/locales";
import type { Db } from "./db";

export function setPreferences(db: Db, userId: number, prefs: { locale?: Locale; theme?: Theme }): void {
  if (prefs.locale) db.prepare("UPDATE users SET locale = ? WHERE id = ?").run(prefs.locale, userId);
  if (prefs.theme) db.prepare("UPDATE users SET theme = ? WHERE id = ?").run(prefs.theme, userId);
}
