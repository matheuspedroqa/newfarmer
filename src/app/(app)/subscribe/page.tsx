import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startCheckoutAction } from "@/app/actions/billing";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { currencyForCountry, formatPrice } from "@/lib/pricing";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getSubscription, hasAccess } from "@/server/subscriptions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("subscribe.metaTitle") };
}

export default async function SubscribePage() {
  const user = await requireUser();
  if (hasAccess(user, await getSubscription(await getDb(), user.id))) redirect("/dashboard");
  const t = await getTranslations("subscribe");
  const price = formatPrice(currencyForCountry(user.countryCode), (await getLocale()) === "pt" ? "pt" : "en");
  const link = "inline-flex min-h-11 items-center text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <section className="max-w-2xl">
      <OnboardingSteps current={3} />
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-3xl font-bold" data-testid="subscribe-price">
        {price}
        <span className="text-base font-normal text-muted">{t("perMonth")}</span>
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-6">
        {(["animals", "calendar", "weather", "diary", "offline"] as const).map((k) => <li key={k}>{t(`features.${k}`)}</li>)}
      </ul>
      <p className="mt-4 text-sm text-muted">{t("billingNote")}</p>
      <p className="mt-2 text-sm text-muted">{t("refund")}</p>
      <form action={startCheckoutAction} className="mt-6">
        <button type="submit" className="min-h-11 w-full rounded-xl bg-primary py-3 font-bold text-primary-text shadow-lg shadow-primary/30 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-80">
          {t("cta", { price })}
        </button>
      </form>
      <p className="mt-4 flex gap-4 text-sm">
        <Link href="/terms" className={link}>{t("terms")}</Link>
        <Link href="/privacy" className={link}>{t("privacy")}</Link>
      </p>
    </section>
  );
}
