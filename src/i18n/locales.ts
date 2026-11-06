export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export type Theme = "light" | "dark";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "pt" || value === "es" ? value : "en";
}

/** Locale do Intl (datas, números, moeda). */
export const intlLocale = (locale: Locale) => ({ pt: "pt-BR", en: "en-US", es: "es-ES" })[locale];

/** Prefixo das páginas públicas: o inglês fica na raiz, os outros em /pt e /es. */
export const localePrefix = (locale: Locale) => (locale === "en" ? "" : `/${locale}`);

export function resolveTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
