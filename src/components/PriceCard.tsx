import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { currencyForCountry, formatPrice } from "@/lib/pricing";

export const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const INCLUDES = ["a", "b", "c", "d", "e"] as const;

/** Preço do país do visitante (pelo cabeçalho da Vercel) com o que vem no plano e o botão do teste grátis. */
export async function PriceCard() {
  const t = await getTranslations("home");
  const price = formatPrice(currencyForCountry((await headers()).get("x-vercel-ip-country")), resolveLocale(await getLocale()));
  return (
    <section className="mx-auto max-w-md px-5 py-16 md:px-8">
      <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("priceTitle")}</h2>
        <p data-testid="price" className="mt-3 font-display text-4xl font-bold text-primary">{t("priceMonth", { price })}</p>
        <ul className="mt-6 space-y-2 text-left">
          {INCLUDES.map((k) => (
            <li key={k} className="flex gap-2"><span aria-hidden className="text-primary">✓</span>{t(`includes.${k}`)}</li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center">
          <Link href="/register" className={`${btn} bg-primary text-primary-text transition-opacity hover:opacity-90 motion-reduce:transition-none`}>
            {t("tryCta")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">{t("tryCtaNote", { price })}</p>
      </div>
    </section>
  );
}
