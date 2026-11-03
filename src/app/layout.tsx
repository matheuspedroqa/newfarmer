import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Fraunces, Nunito } from "next/font/google";
import { cookies } from "next/headers";
import { resolveTheme } from "@/i18n/locales";
import { THEME_COOKIE } from "@/lib/cookies";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-fraunces" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-nunito" });

export const metadata: Metadata = { title: { template: "%s · NewFarmer", default: "NewFarmer" } };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  const classes = [fraunces.variable, nunito.variable, theme === "dark" ? "dark" : ""].join(" ").trim();

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={classes}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
