import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/app-url";
import { LOCALES, localePrefix } from "@/i18n/locales";
import { KNOWLEDGE_COUNTRIES } from "@/lib/countries";
import { guidePaths } from "@/lib/plant-guide";
import { MARKETING_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const marketing = MARKETING_PATHS.flatMap((p) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, `${base}${localePrefix(l)}${p}` || `${base}/`]));
    return LOCALES.map((l) => ({ url: languages[l], alternates: { languages } }));
  });
  const guides = [guidePaths(), ...KNOWLEDGE_COUNTRIES.flatMap((c) => Array.from({ length: 12 }, (_, i) => guidePaths(c, i + 1)))].flatMap((paths) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, `${base}${paths[l]}`]));
    return LOCALES.map((l) => ({ url: languages[l], alternates: { languages } }));
  });
  return [...marketing, ...guides, { url: `${base}/register` }, { url: `${base}/login` }];
}
