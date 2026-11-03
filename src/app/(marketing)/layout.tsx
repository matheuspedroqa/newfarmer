import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TopControls } from "@/components/TopControls";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/90 px-8 py-4 backdrop-blur">
        <p className="font-display text-2xl font-bold text-primary">🌾 {t("app.name")}</p>
        <div className="flex items-center gap-4">
          <TopControls />
          <Link href="/login" className="text-sm text-muted hover:underline">{t("home.login")}</Link>
          <Link href="/cadastro" className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-text">
            {t("home.cta")}
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="flex justify-center gap-6 px-8 py-6 text-sm text-muted">
        <Link href="/privacidade" className="hover:underline">{t("home.privacy")}</Link>
        <Link href="/termos" className="hover:underline">{t("home.terms")}</Link>
      </footer>
    </div>
  );
}
