import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "https://newfarmer.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/animals", "/crops", "/weather", "/profile", "/myfarm", "/welcome", "/subscribe", "/dev/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
