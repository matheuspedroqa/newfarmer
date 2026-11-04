import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  // Next injeta scripts inline de hidratação; 'unsafe-eval' só em dev (recarregamento rápido).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: { "/*": ["./content/legal/**"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  async redirects() {
    return [
      { source: "/cadastro", destination: "/register", permanent: true },
      { source: "/painel", destination: "/dashboard", permanent: true },
      { source: "/animais/:path*", destination: "/animals/:path*", permanent: true },
      { source: "/plantacoes/:path*", destination: "/crops/:path*", permanent: true },
      { source: "/clima", destination: "/weather", permanent: true },
      { source: "/perfil", destination: "/profile", permanent: true },
      { source: "/boas-vindas", destination: "/welcome", permanent: true },
      { source: "/recuperar/username", destination: "/forgot-username", permanent: true },
      { source: "/recuperar/:token", destination: "/reset-password/:token", permanent: true },
      { source: "/recuperar", destination: "/forgot-password", permanent: true },
      { source: "/confirmar/:token", destination: "/confirm-email/:token", permanent: true },
      { source: "/privacidade", destination: "/privacy", permanent: true },
      { source: "/termos", destination: "/terms", permanent: true },
      { source: "/settings/monitoramento", destination: "/admin/monitoring", permanent: true },
      { source: "/settings/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
