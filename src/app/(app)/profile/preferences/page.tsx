import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { requireUser } from "@/server/current-user";
import { LanguageForm } from "../LanguageForm";
import { MarketingForm } from "../MarketingForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.tabPreferences") };
}

/** Preferências: idioma, novidades por e-mail e cookies. */
export default async function PreferencesPage() {
  const user = await requireUser();
  const t = await getTranslations();
  return (
    <>
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.languageTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.languageHelp")}</p>
        <LanguageForm current={user.locale} />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border" data-testid="marketing-card">
        <h2 className="mb-4 font-display text-2xl font-bold">{t("profile.marketingTitle")}</h2>
        <MarketingForm current={user.marketingOptIn} />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-2 font-display text-2xl font-bold">{t("profile.cookiesTitle")}</h2>
        <CookiePreferencesLink className="inline-flex min-h-11 items-center font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      </div>
    </>
  );
}
