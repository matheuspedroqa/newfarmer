"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { setThemeAction } from "@/app/actions/preferences";
import type { Theme } from "@/i18n/locales";
import { THEME_COOKIE } from "@/lib/cookies";

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("toggles");
  const [theme, setTheme] = useState(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    // Grava o cookie na hora: se a pessoa recarregar antes de o servidor responder, o tema não se perde.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    void setThemeAction(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
      title={theme === "dark" ? t("themeLight") : t("themeDark")}
      className="rounded-full border border-border px-3 py-1 text-sm transition-colors duration-150 hover:border-primary hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
