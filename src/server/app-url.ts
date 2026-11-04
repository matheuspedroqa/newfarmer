import "server-only";

/** Única fonte do endereço do site. Em produção sem APP_URL é erro, para não mandar links para localhost. */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL não configurada");
  return "http://localhost:3000";
}

/** Endereço público para SEO (canonical, robots, sitemap): nunca falha, para o build não depender de APP_URL. */
export const siteUrl = () => process.env.APP_URL ?? "https://newfarmer.vercel.app";
