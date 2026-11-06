import { intlLocale, type Locale } from "@/i18n/locales";
import type { ClimateZone, Hemisphere } from "@/server/climate";
import { KNOWLEDGE_COUNTRIES, type KnowledgeCountry } from "./countries";

// Páginas públicas "o que plantar em <mês> em <país>", com endereço na língua da página.
export const GUIDE_BASE: Record<Locale, string> = { en: "/what-to-plant", pt: "/pt/o-que-plantar", es: "/es/que-plantar" };

const COUNTRY_SLUGS: Record<KnowledgeCountry, Record<Locale, string>> = {
  BR: { en: "brazil", pt: "brasil", es: "brasil" },
  US: { en: "united-states", pt: "estados-unidos", es: "estados-unidos" },
  CA: { en: "canada", pt: "canada", es: "canada" },
  DE: { en: "germany", pt: "alemanha", es: "alemania" },
  ES: { en: "spain", pt: "espanha", es: "espana" },
  FR: { en: "france", pt: "franca", es: "francia" },
  PT: { en: "portugal", pt: "portugal", es: "portugal" },
  IT: { en: "italy", pt: "italia", es: "italia" },
  MX: { en: "mexico", pt: "mexico", es: "mexico" },
};

const MONTH_SLUGS: Record<Locale, string[]> = {
  en: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
  pt: ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
};

/** Climas de cada país, o mais comum primeiro (mesma classificação que o cadastro faz pela cidade). */
export const COUNTRY_CLIMATES: Record<KnowledgeCountry, { hemisphere: Hemisphere; zones: ClimateZone[] }> = {
  BR: { hemisphere: "south", zones: ["tropical", "subtropical", "semiarid"] },
  US: { hemisphere: "north", zones: ["temperate", "subtropical", "semiarid", "cold"] },
  CA: { hemisphere: "north", zones: ["cold", "temperate"] },
  DE: { hemisphere: "north", zones: ["temperate"] },
  ES: { hemisphere: "north", zones: ["subtropical", "temperate", "semiarid"] },
  FR: { hemisphere: "north", zones: ["temperate", "subtropical"] },
  PT: { hemisphere: "north", zones: ["subtropical", "temperate"] },
  IT: { hemisphere: "north", zones: ["subtropical", "temperate"] },
  MX: { hemisphere: "north", zones: ["tropical", "subtropical", "semiarid"] },
};

export const monthName = (lang: Locale, month: number) =>
  new Intl.DateTimeFormat(intlLocale(lang), { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 15));

export function guidePath(lang: Locale, country?: KnowledgeCountry, month?: number): string {
  if (!country) return GUIDE_BASE[lang];
  return `${GUIDE_BASE[lang]}/${COUNTRY_SLUGS[country][lang]}/${MONTH_SLUGS[lang][(month ?? 1) - 1]}`;
}

/** Endereço da mesma página em cada idioma (para hreflang e sitemap). */
export const guidePaths = (country?: KnowledgeCountry, month?: number): Record<Locale, string> =>
  ({ en: guidePath("en", country, month), pt: guidePath("pt", country, month), es: guidePath("es", country, month) });

export function parseGuide(lang: Locale, countrySlug: string, monthSlug: string): { country: KnowledgeCountry; month: number } | null {
  const country = KNOWLEDGE_COUNTRIES.find((c) => COUNTRY_SLUGS[c][lang] === countrySlug);
  const month = MONTH_SLUGS[lang].indexOf(monthSlug) + 1;
  return country && month ? { country, month } : null;
}
