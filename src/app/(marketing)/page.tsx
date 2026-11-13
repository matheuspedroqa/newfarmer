import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BrowserFrame } from "@/components/BrowserFrame";
import { FloatingCard, VerifiedSeal } from "@/components/DeviceExtras";
import { PhoneFrame } from "@/components/PhoneFrame";
import { btn } from "@/components/PriceCard";
import { localePrefix, resolveLocale } from "@/i18n/locales";
import { PRICES, type Currency } from "@/lib/pricing";
import { marketingAlternates } from "@/lib/seo";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  // absolute: o título já traz o nome e cabe em 60 caracteres.
  return { title: { absolute: t("title") }, description: t("description"), alternates: marketingAlternates("", "en") };
}

const FEATURES = ["animals", "crops", "weather", "diary", "offline", "rules"] as const;

export default async function HomePage() {
  // Queda do banco não derruba a página pública
  if (await getCurrentUser().catch(() => null)) redirect("/dashboard");
  const t = await getTranslations("home");
  const locale = resolveLocale(await getLocale());
  const img = (name: string, device: "desktop" | "mobile") => `/screenshots/${locale}-${name}-${device}.png`;
  const card = (k: "weather" | "diary" | "count") => ({ icon: t(`cards.${k}.icon`), title: t(`cards.${k}.title`), text: t(`cards.${k}.text`) });
  const cta = (
    <Link href={`${localePrefix(locale)}/try`} className={`${btn} bg-primary text-primary-text transition-opacity hover:opacity-90 motion-reduce:transition-none`}>
      {t("tryNav")}
    </Link>
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "NewFarmer",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, iOS, Android",
      description: t("description"),
      offers: (Object.keys(PRICES) as Currency[]).map((c) => ({
        "@type": "Offer",
        price: (PRICES[c] / 100).toFixed(2),
        priceCurrency: c.toUpperCase(),
      })),
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden px-5 py-12 md:px-8 md:py-20">
        <div aria-hidden className="absolute inset-0 bg-[url('/landscape.svg')] bg-cover bg-bottom dark:brightness-[.55]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div className="min-w-0 rounded-3xl bg-bg/85 p-6 backdrop-blur md:p-8">
            <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-4 text-lg text-muted">{t("heroSub")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {cta}
              <Link href="/login" className={`${btn} text-text ring-1 ring-border hover:bg-soft`}>{t("login")}</Link>
            </div>
          </div>
          <div className="relative min-w-0 md:pb-10 md:pr-6">
            <BrowserFrame>
              <Image src={img("dashboard", "desktop")} alt={t("heroAlt")} width={1440} height={900} sizes="(min-width: 1152px) 560px, (min-width: 768px) 45vw, 90vw" className="h-auto w-full" priority />
            </BrowserFrame>
            <FloatingCard {...card("weather")} className="-left-3 top-1/3 md:-left-8" />
            <FloatingCard {...card("diary")} className="top-12 right-2 md:top-14 md:right-52" />
            <FloatingCard {...card("count")} className="-bottom-3 left-4 md:-left-4 md:bottom-4" />
            <div className="relative mx-auto mt-6 w-40 md:absolute md:bottom-0 md:right-0 md:mt-0 md:w-36 lg:w-40">
              <VerifiedSeal className="-left-5 -top-3 hidden sm:block" />
              <PhoneFrame tilt>
                <Image src={img("dashboard", "mobile")} alt={t("heroPhoneAlt")} width={780} height={1688} sizes="160px" className="h-auto w-full" />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <h2 className="text-center font-display text-3xl font-bold">{t("featuresTitle")}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((k) => (
            <li key={k} className="rounded-3xl bg-surface p-6 ring-1 ring-border">
              <span className="text-4xl" aria-hidden>{t(`features.${k}.icon`)}</span>
              <h3 className="mt-3 font-display text-xl font-bold">{t(`features.${k}.title`)}</h3>
              <p className="mt-2 text-muted">{t(`features.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-16 text-center md:px-8">
        <h2 className="font-display text-3xl font-bold">{t("finalTitle")}</h2>
        <div className="mt-6 flex justify-center">{cta}</div>
      </section>
    </>
  );
}
