import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/app-url";
import { MARKETING_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const marketing = MARKETING_PATHS.flatMap((p) => {
    const en = `${base}${p || "/"}`;
    const pt = `${base}/pt${p}`;
    const languages = { en, pt };
    return [{ url: en, alternates: { languages } }, { url: pt, alternates: { languages } }];
  });
  return [...marketing, { url: `${base}/register` }, { url: `${base}/login` }];
}
