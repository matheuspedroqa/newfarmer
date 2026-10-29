import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveLocale, resolveTheme } from "@/i18n/locales";
import { THEME_COOKIE } from "@/lib/cookies";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function TopControls() {
  const locale = resolveLocale(await getLocale());
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="flex items-center gap-2" data-testid="top-controls">
      <LocaleToggle current={locale} />
      <ThemeToggle initial={theme} />
    </div>
  );
}
