import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthCalendar } from "@/components/MonthCalendar";
import { SourcesList } from "@/components/SourcesList";
import { resolveLocale } from "@/i18n/locales";
import { CROPS, CROP_IDS, type CropId } from "@/lib/catalog";
import { ACTIVITIES, userCalendar } from "@/lib/seasons";
import { getCropContent } from "@/server/content";
import { requireUser } from "@/server/current-user";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!(CROP_IDS as readonly string[]).includes(id)) return {};
  return { title: (await getTranslations())(`crops.${id}`) };
}

export default async function CropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(CROP_IDS as readonly string[]).includes(id)) notFound();
  const user = await requireUser();
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getCropContent(id as CropId);
  const crop = CROPS.find((c) => c.id === id)!;
  const tx = (v: { pt: string; en: string }) => v[locale];
  const back = (
    <Link href="/plantacoes" className="text-sm text-primary hover:underline">← {t("cropPage.groups")}</Link>
  );
  const title = (
    <h1 className="font-display text-4xl font-bold"><span aria-hidden>{crop.icon}</span> {t(`crops.${id}`)}</h1>
  );

  if (!content) {
    return (
      <section className="space-y-4">
        {back}
        {title}
        <p className="text-muted">{t("cropPage.noContent")}</p>
      </section>
    );
  }

  const zoneCal = content.calendar[user.climateZone];
  const months = userCalendar(zoneCal, user.hemisphere);
  const suited = ACTIVITIES.some((a) => months[a].length > 0);

  return (
    <section className="space-y-8">
      {back}
      {title}
      <p className="max-w-3xl text-lg">{tx(content.summary)}</p>

      <section className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">
          {t("cropPage.calendar", { zone: t(`climate.${user.climateZone}`), hemisphere: t(`climate.${user.hemisphere}`) })}
        </h2>
        {suited ? (
          <div className="mt-4">
            <MonthCalendar months={months} currentMonth={new Date().getMonth() + 1} />
          </div>
        ) : (
          <p className="mt-3 font-semibold text-accent">{t("cropPage.notSuited")}</p>
        )}
        {zoneCal.notes && <p className="mt-3 text-sm text-muted">{tx(zoneCal.notes)}</p>}
      </section>

      <div className="grid grid-cols-2 gap-4">
        {(["fertilizing", "watering", "other"] as const).map((k) => (
          <section key={k} className="rounded-2xl bg-soft p-5">
            <h2 className="font-display text-xl font-bold">{t(`cropPage.${k}`)}</h2>
            <p className="mt-1">{tx(content.care[k])}</p>
          </section>
        ))}
        <section className="rounded-2xl bg-soft p-5">
          <h2 className="font-display text-xl font-bold">{t("cropPage.pruning")}</h2>
          <p className="mt-1">{content.care.pruning ? tx(content.care.pruning) : t("cropPage.noPruning")}</p>
        </section>
      </div>

      <SourcesList sources={content.sources} />
    </section>
  );
}
