"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { setThemeAction } from "@/app/actions/preferences";
import type { Theme } from "@/i18n/locales";

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("toggles");
  const [theme, setTheme] = useState(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    void setThemeAction(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
      title={theme === "dark" ? t("themeLight") : t("themeDark")}
      className="rounded-full border border-border px-3 py-1 text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
