import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { TopControls } from "@/components/TopControls";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-bg/90 px-5 py-4 md:px-8 backdrop-blur">
        <p className="font-display text-2xl font-bold text-primary">🌾 {t("app.name")}</p>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <TopControls />
          <Link href="/login" className="inline-flex min-h-11 items-center px-1 text-sm text-muted transition-colors duration-150 hover:text-text hover:underline motion-reduce:transition-none">{t("home.login")}</Link>
          <Link href="/register" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2 font-semibold text-primary-text transition-opacity duration-150 hover:opacity-90 motion-reduce:transition-none">
            {t("home.cta")}
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="flex flex-wrap justify-center gap-6 px-8 py-6 text-sm text-muted">
        <Link href="/privacy" className="hover:underline">{t("home.privacy")}</Link>
        <Link href="/terms" className="hover:underline">{t("home.terms")}</Link>
        <CookiePreferencesLink className="hover:underline" />
      </footer>
    </div>
  );
}
