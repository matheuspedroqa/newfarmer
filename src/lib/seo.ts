import type { Metadata } from "next";

/** Canônico e variantes de idioma de uma página de marketing (path em inglês: "", "/try", "/contact", "/privacy", "/terms"). */
export function marketingAlternates(path: string, lang: "en" | "pt"): Metadata["alternates"] {
  const en = path || "/";
  const pt = `/pt${path}`;
  return { canonical: lang === "pt" ? pt : en, languages: { en, pt, "x-default": en } };
}

export const MARKETING_PATHS = ["", "/try", "/contact", "/privacy", "/terms"] as const;
