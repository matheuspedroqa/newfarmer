import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Fraunces, Nunito } from "next/font/google";
import { cookies } from "next/headers";
import { resolveTheme } from "@/i18n/locales";
import { CookieNotice } from "@/components/CookieNotice";
import { COOKIE_NOTICE_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-fraunces" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-nunito" });

export async function generateMetadata(): Promise<Metadata> {
  const description = (await getTranslations())("meta.description");
  return {
    metadataBase: new URL(process.env.APP_URL ?? "https://newfarmer.vercel.app"),
    description,
    openGraph: { siteName: "NewFarmer", type: "website", description },
    twitter: { card: "summary_large_image" },
    title: { template: "%s · NewFarmer", default: "NewFarmer" },
    // Instalar na tela inicial do iPhone abre sem a barra do Safari, como um app.
    appleWebApp: { capable: true, title: "NewFarmer", statusBarStyle: "default" },
  };
}
// viewportFit "cover" faz o env(safe-area-inset-*) funcionar no iPhone; o zoom continua liberado.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const jar = await cookies();
  const theme = resolveTheme(jar.get(THEME_COOKIE)?.value);
  const showNotice = !jar.has(COOKIE_NOTICE_COOKIE);
  const classes = [fraunces.variable, nunito.variable, theme === "dark" ? "dark" : ""].join(" ").trim();

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={classes}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          {showNotice && <CookieNotice />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
