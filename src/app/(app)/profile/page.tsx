import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { requireUser } from "@/server/current-user";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { LanguageForm } from "./LanguageForm";
import { PasswordForm } from "./PasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.title") };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations();
  const info: [string, string][] = [
    [t("profile.name"), user.name],
    [t("auth.username"), user.username],
    [t("profile.email"), user.email],
    [t("profile.city"), user.cityLabel],
    [t("profile.climate"), `${t(`climate.${user.climateZone}`)} · ${t(`climate.${user.hemisphere}`)}`],
  ];

  return (
    <section className="max-w-4xl space-y-8">
      <h1 className="font-display text-4xl font-bold">{t("profile.title")}</h1>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.info")}</h2>
        <dl data-testid="profile-info" className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.languageTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.languageHelp")}</p>
        <LanguageForm current={user.locale} />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-4 font-display text-2xl font-bold">{t("profile.passwordTitle")}</h2>
        <PasswordForm />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.dataTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.dataHelp")}</p>
        <a
          href="/api/account/data"
          download
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-primary px-5 py-3 font-bold transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-60"
        >
          {t("profile.download")}
        </a>
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <CookiePreferencesLink className="inline-flex min-h-11 items-center font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-danger/40">
        <h2 className="font-display text-2xl font-bold text-danger">{t("profile.deleteTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.deleteHelp")}</p>
        <DeleteAccountForm />
      </div>
    </section>
  );
}
