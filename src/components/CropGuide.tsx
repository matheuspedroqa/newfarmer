import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MonthCalendar } from "@/components/MonthCalendar";
import { btn } from "@/components/PriceCard";
import { SourcesList } from "@/components/SourcesList";
import type { Locale } from "@/i18n/locales";
import { CROPS, CROP_GROUPS } from "@/lib/catalog";
import { cropGuidePath, cropGuidePaths, parseCropSlug } from "@/lib/crop-guide";
import { guidePath } from "@/lib/plant-guide";
import { ACTIVITIES, userCalendar } from "@/lib/seasons";
import { getCropContent } from "@/server/content";
import type { ClimateZone } from "@/server/climate";
import { ItemIcon } from "@/components/ItemIcon";

const ZONES: ClimateZone[] = ["tropical", "subtropical", "temperate", "semiarid", "cold"];
const alternates = (paths: Record<Locale, string>, lang: Locale): Metadata["alternates"] => ({ canonical: paths[lang], languages: { ...paths, "x-default": paths.en } });
const chip = "inline-flex min-h-11 items-center gap-1 rounded-full bg-surface px-4 py-2 ring-1 ring-border hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
// Quem lê em português está quase sempre no Brasil; inglês e espanhol, no norte.
const hemisphereFor = (lang: Locale) => (lang === "pt" ? "south" : "north");
const clip = (s: string, max = 155) => (s.length <= max ? s : `${s.slice(0, s.lastIndexOf(" ", max - 1))}…`);

export async function cropIndexMetadata(lang: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale: lang, namespace: "cropGuide" });
  return { title: t("indexTitle"), description: t("indexIntro"), alternates: alternates(cropGuidePaths(), lang) };
}

export async function CropIndex({ lang }: { lang: Locale }) {
  const t = await getTranslations({ locale: lang });
  return (
    <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-4xl font-bold text-primary">{t("cropGuide.indexTitle")}</h1>
      <p className="mt-3 text-lg text-muted">{t("cropGuide.indexIntro")}</p>
      {CROP_GROUPS.map((g) => (
        <section key={g} className="mt-8">
          <h2 className="font-display text-2xl font-bold">{t(`cropGroups.${g}`)}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CROPS.filter((c) => c.group === g && getCropContent(c.id)).map((c) => (
              <li key={c.id}><Link href={cropGuidePath(lang, c.id)} className={chip}><ItemIcon id={c.id} /> {t(`crops.${c.id}`)}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

type Params = Promise<{ crop: string }>;

async function resolveCrop(lang: Locale, params: Params) {
  const id = parseCropSlug(lang, (await params).crop);
  const content = id && getCropContent(id);
  if (!id || !content) notFound();
  return { id, content };
}

export async function cropPageMetadata(lang: Locale, params: Params): Promise<Metadata> {
  const { id, content } = await resolveCrop(lang, params);
  const t = await getTranslations({ locale: lang });
  const crop = t(`crops.${id}`).toLocaleLowerCase(lang);
  return { title: t("cropGuide.title", { crop }), description: clip(content.summary[lang]), alternates: alternates(cropGuidePaths(id), lang) };
}

export async function CropGuidePage({ lang, params }: { lang: Locale; params: Params }) {
  const { id, content } = await resolveCrop(lang, params);
  const t = await getTranslations({ locale: lang });
  const crop = t(`crops.${id}`).toLocaleLowerCase(lang);
  const hemisphere = hemisphereFor(lang);

  return (
    <article className="mx-auto max-w-4xl space-y-8 px-5 py-12 md:px-8 md:py-16">
      <div>
        <Link href={cropGuidePath(lang)} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">← {t("cropGuide.indexTitle")}</Link>
        <h1 className="mt-2 font-display text-4xl font-bold text-primary first-letter:uppercase"><ItemIcon id={id} /> {t("cropGuide.title", { crop })}</h1>
        <p className="mt-3 text-lg">{content.summary[lang]}</p>
        <p className="mt-2 text-sm text-muted">{t(`cropGuide.hemisphereNote.${hemisphere}`)}</p>
      </div>

      {ZONES.map((zone) => {
        const cal = content.calendar[zone];
        const months = userCalendar(cal, hemisphere);
        return (
          <section key={zone} className="rounded-3xl bg-surface p-4 ring-1 ring-border md:p-6">
            <h2 className="font-display text-2xl font-bold">{t("cropGuide.zoneTitle", { crop, zone: t(`climate.${zone}`).toLocaleLowerCase(lang) })}</h2>
            {ACTIVITIES.some((a) => months[a].length) ? (
              <div className="mt-4"><MonthCalendar months={months} currentMonth={new Date().getUTCMonth() + 1} /></div>
            ) : (
              <p className="mt-3 font-semibold text-accent">{t("cropGuide.notSuited")}</p>
            )}
            {cal.notes && <p className="mt-3 text-sm text-muted">{cal.notes[lang]}</p>}
          </section>
        );
      })}

      <section>
        <h2 className="font-display text-2xl font-bold">{t("cropGuide.howTitle", { crop })}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["fertilizing", "watering", "other"] as const).map((k) => (
            <section key={k} className="rounded-2xl bg-soft p-5">
              <h3 className="font-display text-xl font-bold">{t(`cropPage.${k}`)}</h3>
              <p className="mt-1">{content.care[k][lang]}</p>
            </section>
          ))}
          <section className="rounded-2xl bg-soft p-5">
            <h3 className="font-display text-xl font-bold">{t("cropPage.pruning")}</h3>
            <p className="mt-1">{content.care.pruning ? content.care.pruning[lang] : t("cropPage.noPruning")}</p>
          </section>
        </div>
      </section>

      <section className="rounded-3xl bg-soft p-6 text-center ring-1 ring-border md:p-8">
        <h2 className="font-display text-2xl font-bold">{t("guide.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("guide.ctaText")}</p>
        <Link href="/register" className={`${btn} mt-5 bg-primary text-primary-text transition-opacity hover:opacity-90 motion-reduce:transition-none`}>{t("guide.ctaButton")}</Link>
        <p className="mt-4"><Link href={guidePath(lang)} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">{t("guide.indexTitle")} →</Link></p>
      </section>

      <SourcesList sources={content.sources} />
    </article>
  );
}
