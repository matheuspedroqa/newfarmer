import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/animals", "/crops", "/weather", "/profile", "/myfarm", "/welcome", "/subscribe", "/dev/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
