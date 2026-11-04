import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BrowserFrame } from "@/components/BrowserFrame";
import { FloatingCard, VerifiedSeal } from "@/components/DeviceExtras";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ShowcaseToggle } from "@/components/ShowcaseToggle";
import { resolveLocale } from "@/i18n/locales";
import { currencyForCountry, formatPrice, PRICES, type Currency } from "@/lib/pricing";
import { marketingAlternates } from "@/lib/seo";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  // absolute: o título já traz o nome e cabe em 60 caracteres.
  return { title: { absolute: t("title") }, description: t("description"), alternates: marketingAlternates("", "en") };
}

const FEATURES = ["animals", "crops", "weather", "diary", "offline", "rules"] as const;
const SHOTS = ["dashboard", "animal", "weather"] as const;
const STEPS = ["one", "two", "three"] as const;
const INCLUDES = ["a", "b", "c", "d", "e"] as const;
const FAQ = ["card", "cancel", "offline", "data", "who"] as const;

const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default async function HomePage() {
  // Queda do banco não derruba a página pública
  if (await getCurrentUser().catch(() => null)) redirect("/dashboard");
  const t = await getTranslations("home");
  const locale = resolveLocale(await getLocale());
  const currency = currencyForCountry((await headers()).get("x-vercel-ip-country"));
  const price = formatPrice(currency, locale);
  const img = (name: string, device: "desktop" | "mobile") => `/screenshots/${locale}-${name}-${device}.png`;
  const card = (k: "weather" | "diary" | "count") => ({ icon: t(`cards.${k}.icon`), title: t(`cards.${k}.title`), text: t(`cards.${k}.text`) });
  const cta = (
    <Link href="/register" className={`${btn} bg-primary text-primary-text transition-opacity hover:opacity-90 motion-reduce:transition-none`}>
      {t("ctaPrice", { price })}
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
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((k) => ({
        "@type": "Question",
        name: t(`faq.${k}.q`),
        acceptedAnswer: { "@type": "Answer", text: t(`faq.${k}.a`) },
      })),
    },
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
            <FloatingCard {...card("diary")} className="-top-4 right-4 md:right-24" />
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

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="text-center font-display text-3xl font-bold">{t("insideTitle")}</h2>
        <ShowcaseToggle
          labels={{ desktop: t("desktop"), mobile: t("mobile") }}
          shots={SHOTS.map((k) => ({ name: k, card: card(k === "dashboard" ? "count" : k === "animal" ? "diary" : "weather"), path: k === "dashboard" ? "/dashboard" : k === "animal" ? "/animals/chickens" : "/weather", src: { desktop: img(k, "desktop"), mobile: img(k, "mobile") }, alt: t(`alts.${k}`), caption: t(`shots.${k}`) }))}
        />
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <h2 className="text-center font-display text-3xl font-bold">{t("stepsTitle")}</h2>
        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((k, i) => (
            <li key={k} className="rounded-3xl bg-soft p-6">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-text">{i + 1}</span>
              <h3 className="mt-3 font-display text-xl font-bold">{t(`steps.${k}.title`)}</h3>
              <p className="mt-2 text-muted">{t(`steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-md px-5 py-16 md:px-8">
        <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">{t("priceTitle")}</h2>
          <p data-testid="price" className="mt-3 font-display text-4xl font-bold text-primary">{t("priceMonth", { price })}</p>
          <ul className="mt-6 space-y-2 text-left">
            {INCLUDES.map((k) => (
              <li key={k} className="flex gap-2"><span aria-hidden className="text-primary">✓</span>{t(`includes.${k}`)}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">{t("priceCancel")}</p>
          <div className="mt-4 flex justify-center">{cta}</div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <h2 className="text-center font-display text-3xl font-bold">{t("faqTitle")}</h2>
        <dl className="mt-8 space-y-4">
          {FAQ.map((k) => (
            <div key={k} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
              <dt className="font-bold">{t(`faq.${k}.q`)}</dt>
              <dd className="mt-1 text-muted">{t(`faq.${k}.a`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-5 py-16 text-center md:px-8">
        <h2 className="font-display text-3xl font-bold">{t("finalTitle")}</h2>
        <div className="mt-6 flex justify-center">{cta}</div>
      </section>
    </>
  );
}
