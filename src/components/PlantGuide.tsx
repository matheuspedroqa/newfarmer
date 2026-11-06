import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { btn } from "@/components/PriceCard";
import { intlLocale, type Locale } from "@/i18n/locales";
import { CROPS } from "@/lib/catalog";
import { KNOWLEDGE_COUNTRIES, type KnowledgeCountry } from "@/lib/countries";
import { COUNTRY_CLIMATES, guidePath, guidePaths, parseGuide } from "@/lib/plant-guide";
import { monthlyTasks, plantableThisMonth } from "@/lib/seasons";
import { getAllCropContent } from "@/server/content";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const monthName = (lang: Locale, month: number) =>
  new Intl.DateTimeFormat(intlLocale(lang), { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 15));
const alternates = (paths: Record<Locale, string>, lang: Locale): Metadata["alternates"] => ({ canonical: paths[lang], languages: { ...paths, "x-default": paths.en } });
const chip = "inline-flex min-h-11 items-center gap-1 rounded-full bg-surface px-4 py-2 ring-1 ring-border hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export async function guideIndexMetadata(lang: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale: lang, namespace: "guide" });
  return { title: t("indexTitle"), description: t("indexIntro"), alternates: alternates(guidePaths(), lang) };
}

export async function GuideIndex({ lang }: { lang: Locale }) {
  const t = await getTranslations({ locale: lang });
  // O mês sai do relógio a cada visita: vira sozinho no dia 1.
  const now = new Date().getUTCMonth() + 1;
  return (
    <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-4xl font-bold text-primary">{t("guide.indexTitle")}</h1>
      <p className="mt-3 text-lg text-muted">{t("guide.indexIntro")}</p>
      <ul className="mt-8 space-y-6">
        {KNOWLEDGE_COUNTRIES.map((c) => (
          <li key={c} data-testid="guide-country" className="rounded-3xl bg-surface p-5 ring-1 ring-border">
            <Link href={guidePath(lang, c, now)} className="font-display text-2xl font-bold text-primary hover:underline">
              {t(`countries.${c}`)} · {monthName(lang, now)}
            </Link>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {MONTHS.map((m) => (
                <li key={m}><Link href={guidePath(lang, c, m)} className="inline-flex min-h-11 items-center hover:underline md:min-h-0">{t(`months.${m}`)}</Link></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Params = Promise<{ country: string; month: string }>;

async function resolveGuide(lang: Locale, params: Params) {
  const { country, month } = await params;
  const guide = parseGuide(lang, country, month);
  if (!guide) notFound();
  return guide;
}

export async function guideMonthMetadata(lang: Locale, params: Params): Promise<Metadata> {
  const { country, month } = await resolveGuide(lang, params);
  const t = await getTranslations({ locale: lang, namespace: "guide" });
  const vars = { month: monthName(lang, month), inCountry: t(`inCountry.${country}`) };
  return { title: t("title", vars), description: t("description", vars), alternates: alternates(guidePaths(country, month), lang) };
}

export async function GuideMonth({ lang, params }: { lang: Locale; params: Params }) {
  const { country, month } = await resolveGuide(lang, params);
  const t = await getTranslations({ locale: lang });
  const { hemisphere, zones } = COUNTRY_CLIMATES[country];
  const crops = getAllCropContent();
  const vars = { month: monthName(lang, month), inCountry: t(`guide.inCountry.${country}`) };
  const prev = ((month + 10) % 12) + 1;
  const next = (month % 12) + 1;
  const icon = (id: string) => CROPS.find((c) => c.id === id)!.icon;

  return (
    <article className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
      <Link href={guidePath(lang)} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">← {t("guide.indexTitle")}</Link>
      <h1 className="mt-2 font-display text-4xl font-bold text-primary first-letter:uppercase">{t("guide.title", vars)}</h1>
      <p className="mt-3 text-lg text-muted">{t(zones.length > 1 ? "guide.introMany" : "guide.introOne", vars)}</p>

      {zones.map((zone) => {
        const plantable = plantableThisMonth(crops, zone, hemisphere, month);
        const tasks = monthlyTasks(crops.filter((c) => plantable.includes(c.id)), zone, hemisphere, month);
        return (
          <section key={zone} data-testid={`guide-zone-${zone}`} className="mt-8">
            <h2 className="font-display text-2xl font-bold">{t("guide.zoneTitle", { zone: t(`climate.${zone}`) })}</h2>
            {tasks.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {tasks.map((task) => (
                  <li key={task.cropId} className={chip}>
                    <span aria-hidden>{icon(task.cropId)}</span> <b>{t(`crops.${task.cropId}`)}</b>
                    <span className="text-sm text-muted">· {task.activities.filter((a) => a !== "harvest").map((a) => t(`activities.${a}`)).join(", ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">{t("guide.zoneEmpty")}</p>
            )}
          </section>
        );
      })}

      <section className="mt-10 rounded-3xl bg-soft p-6 text-center ring-1 ring-border md:p-8">
        <h2 className="font-display text-2xl font-bold">{t("guide.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("guide.ctaText")}</p>
        <Link href="/register" className={`${btn} mt-5 bg-primary text-primary-text transition-opacity hover:opacity-90 motion-reduce:transition-none`}>{t("guide.ctaButton")}</Link>
      </section>

      <nav aria-label={t("guide.otherMonths")} className="mt-10 flex flex-wrap justify-between gap-3">
        <Link href={guidePath(lang, country, prev)} className={chip}>← <span className="first-letter:uppercase">{monthName(lang, prev)}</span></Link>
        <Link href={guidePath(lang, country, next)} className={chip}><span className="first-letter:uppercase">{monthName(lang, next)}</span> →</Link>
      </nav>
      <nav aria-label={t("guide.otherCountries")} className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-accent">{t("guide.otherCountries")}</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {KNOWLEDGE_COUNTRIES.filter((c) => c !== country).map((c: KnowledgeCountry) => (
            <li key={c}><Link href={guidePath(lang, c, month)} className={chip}>{t(`countries.${c}`)}</Link></li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
