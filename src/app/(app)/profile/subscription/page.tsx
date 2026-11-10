import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { openPortalAction } from "@/app/actions/billing";
import { intlLocale, resolveLocale } from "@/i18n/locales";
import { currencyForCountry, formatMoney, PRICES, type Currency } from "@/lib/pricing";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getSubscription, isAccessStatus } from "@/server/subscriptions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.tabSubscription") };
}

export default async function SubscriptionPage() {
  const user = await requireUser();
  const t = await getTranslations("billing");
  // O dono não paga: vê uma prévia do que o assinante vê (nada é cobrado nem cancelado).
  const preview = user.isPlatformAdmin;
  const currency = currencyForCountry(user.countryCode);
  const sub = preview
    ? { subscriptionId: "preview", status: "active", startedAt: Date.now(), amount: PRICES[currency], currency, currentPeriodEnd: Date.now() + 30 * 86_400_000, cancelAtPeriodEnd: false }
    : await getSubscription(await getDb(), user.id);
  const locale = resolveLocale(await getLocale());
  const status = sub?.status === "active" || sub?.status === "trialing" ? "active" : sub?.status === "past_due" ? "past_due" : sub?.status === "paused" ? "paused" : sub?.status === "canceled" ? "canceled" : "none";
  const day = (ms: number) => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(ms);
  const date = sub?.currentPeriodEnd ? day(sub.currentPeriodEnd) : null;
  const btn = "inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-primary px-5 py-3 font-bold transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-60";
  const cancelable = sub?.subscriptionId && isAccessStatus(sub.status) && !sub.cancelAtPeriodEnd;

  return (
    <div className="rounded-3xl bg-surface p-6 ring-1 ring-border" data-testid="billing-card">
      <h2 className="font-display text-2xl font-bold">{t("title")}</h2>
      {preview && <p data-testid="owner-preview" className="mt-2 rounded-xl bg-soft px-4 py-3 text-sm">{t("ownerPreview")}</p>}
      <>
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          <dt className="font-semibold text-muted">{t("status")}</dt>
          <dd>{t(status)}</dd>
          {sub?.startedAt && status !== "none" && (
            <>
              <dt className="font-semibold text-muted">{t("since")}</dt>
              <dd>{day(sub.startedAt)}</dd>
            </>
          )}
          {sub?.amount !== null && sub?.amount !== undefined && sub.currency && status !== "none" && (
            <>
              <dt className="font-semibold text-muted">{t("price")}</dt>
              <dd data-testid="billing-price">{t("perMonth", { price: formatMoney(sub.currency as Currency, sub.amount, locale) })}</dd>
            </>
          )}
          {date && status !== "none" && status !== "canceled" && status !== "paused" && (
            <>
              <dt className="font-semibold text-muted">{sub?.cancelAtPeriodEnd ? t("accessUntilLabel") : t("nextChargeLabel")}</dt>
              <dd>{date}</dd>
            </>
          )}
        </dl>
        {status === "paused" && <p className="mt-3 text-sm text-muted">{t("pausedNote")}</p>}
        {sub?.cancelAtPeriodEnd && date && <p role="status" className="mt-4 rounded-xl bg-soft px-4 py-3">{t("cancelScheduled", { date })}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {preview ? null : sub && status !== "none" && status !== "canceled" ? (
            <form action={openPortalAction}><button type="submit" className={btn}>{t("manage")}</button></form>
          ) : (
            <Link href="/subscribe" className={btn}>{t("subscribe")}</Link>
          )}
          {cancelable && (
            <Link href="/profile/subscription/cancel" className={`${btn} border-danger text-danger`}>{t("cancel")}</Link>
          )}
        </div>
      </>
    </div>
  );
}
