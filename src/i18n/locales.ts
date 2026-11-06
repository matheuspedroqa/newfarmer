export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export type Theme = "light" | "dark";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "pt" || value === "es" ? value : "en";
}

/** Idioma preferido do navegador (Accept-Language) entre os do site, respeitando os pesos q; null se nenhum serve. */
export function browserLocale(acceptLanguage: string | null | undefined): Locale | null {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.trim().slice(2) ?? 1);
      return { lang: tag.split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((l) => l.q > 0)
    .sort((a, b) => b.q - a.q);
  return (ranked.find((l) => (LOCALES as readonly string[]).includes(l.lang))?.lang as Locale) ?? null;
}

/** Locale do Intl (datas, números, moeda). */
export const intlLocale = (locale: Locale) => ({ pt: "pt-BR", en: "en-US", es: "es-ES" })[locale];

/** Prefixo das páginas públicas: o inglês fica na raiz, os outros em /pt e /es. */
export const localePrefix = (locale: Locale) => (locale === "en" ? "" : `/${locale}`);

export function resolveTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
