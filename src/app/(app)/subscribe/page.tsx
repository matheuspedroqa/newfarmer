import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startCheckoutAction } from "@/app/actions/billing";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { resolveLocale } from "@/i18n/locales";
import { currencyForCountry, formatPrice } from "@/lib/pricing";
import { requireUser, subscriptionOf } from "@/server/current-user";
import { getDb } from "@/server/db";
import { hasAccess, trialEligible } from "@/server/subscriptions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("subscribe.metaTitle") };
}

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sub = await subscriptionOf(user.id);
  if (hasAccess(user, sub)) redirect("/dashboard");
  const t = await getTranslations("subscribe");
  const { error } = await searchParams;
  const formError = error === "rateLimited" ? "rateLimited" : error === "checkout" ? "checkoutFailed" : null;
  const price = formatPrice(currencyForCountry(user.countryCode), resolveLocale(await getLocale()));
  const trial = await trialEligible(await getDb(), user.id);
  const link = "inline-flex min-h-11 items-center text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <section className="max-w-2xl">
      <OnboardingSteps current={3} />
      <h1 className="font-display text-4xl font-bold">{t(trial ? "trialTitle" : "title")}</h1>
      <p className="mt-4 text-3xl font-bold" data-testid="subscribe-price">
        {price}
        <span className="text-base font-normal text-muted">{t("perMonth")}</span>
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-6">
        {(["animals", "calendar", "weather", "diary", "offline"] as const).map((k) => <li key={k}>{t(`features.${k}`)}</li>)}
      </ul>
      <p className="mt-4 text-sm text-muted">{t(trial ? "trialNote" : "billingNote", { price })}</p>
      <p className="mt-2 text-sm text-muted">{t("refund")}</p>
      {formError && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{(await getTranslations("errors"))(formError)}</p>}
      {sub?.status === "paused" ? (
        <p role="status" data-testid="subscription-paused" className="mt-6 rounded-xl bg-soft px-4 py-3 font-semibold">{t("paused")}</p>
      ) : (
        <form action={startCheckoutAction} className="mt-6">
          <button type="submit" className="min-h-11 w-full rounded-xl bg-primary py-3 font-bold text-primary-text shadow-lg shadow-primary/30 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-80">
            {t(trial ? "trialCta" : "cta", { price })}
          </button>
        </form>
      )}
      <p className="mt-4 flex gap-4 text-sm">
        <Link href="/terms" className={link}>{t("terms")}</Link>
        <Link href="/privacy" className={link}>{t("privacy")}</Link>
      </p>
    </section>
  );
}
