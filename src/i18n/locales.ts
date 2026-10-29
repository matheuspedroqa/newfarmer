export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export type Theme = "light" | "dark";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "pt" ? "pt" : "en";
}

export function resolveTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
