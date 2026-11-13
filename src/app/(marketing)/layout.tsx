import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { TopControls } from "@/components/TopControls";
import { localePrefix, resolveLocale } from "@/i18n/locales";
import { guidePath } from "@/lib/plant-guide";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const pt = localePrefix(locale);
  const navLink = "inline-flex min-h-11 items-center px-1 text-sm text-muted transition-colors duration-150 hover:text-text hover:underline motion-reduce:transition-none";
  const footLink = "inline-flex min-h-11 items-center hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Computador: logo | Experimente já no centro | controles. Celular: o Experimente já ocupa a linha de baixo inteira. */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-bg/90 px-5 py-4 backdrop-blur md:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link href={pt || "/"} className="font-display text-2xl font-bold text-primary">🌾 {t("app.name")}</Link>
        <Link
          href={`${pt}/try`}
          className="order-last inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-soft px-6 py-2 font-bold text-primary ring-2 ring-primary transition-colors duration-150 hover:bg-primary hover:text-primary-text focus-visible:outline-none focus-visible:ring-4 motion-reduce:transition-none lg:order-none lg:w-auto"
        >
          <span aria-hidden>✨</span> {t("home.tryNav")}
        </Link>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 lg:justify-self-end">
          <TopControls />
          <Link href="/login" className={navLink}>{t("home.login")}</Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* Todos com a mesma altura e centrados: o botão de cookies não fica mais baixo que os links. */}
      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-8 py-6 text-sm text-muted">
        <Link href="/privacy" className={footLink}>{t("home.privacy")}</Link>
        <Link href="/terms" className={footLink}>{t("home.terms")}</Link>
        <Link href={guidePath(locale)} className={footLink}>{t("guide.footer")}</Link>
        <Link href={`${pt}/contact`} className={footLink}>{t("contact.footer")}</Link>
        <CookiePreferencesLink className={footLink} />
      </footer>
    </div>
  );
}
