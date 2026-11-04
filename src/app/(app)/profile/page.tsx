import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { openPortalAction } from "@/app/actions/billing";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getSubscription } from "@/server/subscriptions";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { LanguageForm } from "./LanguageForm";
import { MarketingForm } from "./MarketingForm";
import { PasswordForm } from "./PasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.title") };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations();
  const sub = await getSubscription(await getDb(), user.id);
  const locale = await getLocale();
  const status = sub?.status === "active" || sub?.status === "trialing" ? "active" : sub?.status === "past_due" ? "past_due" : sub?.status === "canceled" ? "canceled" : "none";
  const date = sub?.currentPeriodEnd ? new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", { dateStyle: "long" }).format(sub.currentPeriodEnd) : null;
  const btn = "inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-primary px-5 py-3 font-bold transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-60";
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

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border" data-testid="billing-card">
        <h2 className="font-display text-2xl font-bold">{t("billing.title")}</h2>
        {user.isPlatformAdmin ? (
          <p className="mt-2">{t("billing.owner")}</p>
        ) : (
          <>
            <p className="mt-2"><span className="font-semibold text-muted">{t("billing.status")}:</span> {t(`billing.${status}`)}</p>
            {date && status !== "none" && status !== "canceled" && (
              <p className="text-sm text-muted">{sub?.cancelAtPeriodEnd ? t("billing.accessUntil", { date }) : t("billing.nextCharge", { date })}</p>
            )}
            <div className="mt-4">
              {sub && status !== "none" ? (
                <form action={openPortalAction}><button type="submit" className={btn}>{t("billing.manage")}</button></form>
              ) : (
                <Link href="/subscribe" className={btn}>{t("billing.subscribe")}</Link>
              )}
            </div>
          </>
        )}
      </div>

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
