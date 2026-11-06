import type { Metadata } from "next";
import { LOCALES, localePrefix, type Locale } from "@/i18n/locales";

/** Canônico e variantes de idioma de uma página pública. `paths` dá o endereço de cada idioma; uma string vale para todos com o prefixo (/pt, /es). */
export function marketingAlternates(paths: string | Record<Locale, string>, lang: Locale): Metadata["alternates"] {
  const url = (l: Locale) => (typeof paths === "string" ? `${localePrefix(l)}${paths}` : paths[l]) || "/";
  return { canonical: url(lang), languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") } };
}

export const MARKETING_PATHS = ["", "/try", "/contact", "/privacy", "/terms"] as const;
