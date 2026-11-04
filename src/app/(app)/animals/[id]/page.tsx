import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteDiaryAction } from "@/app/actions/diary";
import { CountryNotes } from "@/components/CountryNotes";
import { DiaryForm } from "@/components/DiaryForm";
import { SourcesList } from "@/components/SourcesList";
import { VetWarning } from "@/components/VetWarning";
import { resolveLocale } from "@/i18n/locales";
import { ANIMALS, ANIMAL_IDS, type AnimalId } from "@/lib/catalog";
import { seasonFor, type Season } from "@/lib/seasons";
import { formatDay } from "@/lib/format";
import { getAnimalContent } from "@/server/content";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { listDiary } from "@/server/diary";
import { getFarm } from "@/server/farm";

const SEASONS: Season[] = ["summer", "autumn", "winter", "spring"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!(ANIMAL_IDS as readonly string[]).includes(id)) return {};
  return { title: (await getTranslations())(`animals.${id}`) };
}

export default async function AnimalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; aba?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const showDiary = sp.tab === "diary" || sp.aba === "diario";
  if (!(ANIMAL_IDS as readonly string[]).includes(id)) notFound();
  const user = await requireUser();
  const db = await getDb();
  const farm = await getFarm(db, user.id);
  const inFarm = farm.animals.some((a) => a.id === id);
  // Animal fora do MyFarm só abre se ainda houver anotações dele (links do Painel).
  if (!inFarm && !(await listDiary(db, user.id, { animalId: id as AnimalId, limit: 1 })).length) redirect("/animals");
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getAnimalContent(id as AnimalId);
  const current = seasonFor(new Date().getMonth() + 1, user.hemisphere);
  const tx = (v: { pt: string; en: string }) => v[locale];
  const diary = showDiary ? await listDiary(db, user.id, { animalId: id as AnimalId }) : [];

  return (
    <section className="space-y-8">
      <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:pb-0" aria-label={t("nav.animals")}>
        {ANIMALS.filter((a) => farm.animals.some((f) => f.id === a.id)).map((a) => (
          <Link
            key={a.id}
            href={`/animals/${a.id}`}
            data-testid={`animal-tab-${a.id}`}
            aria-current={a.id === id ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 py-2 whitespace-nowrap md:min-h-0 ${a.id === id ? "bg-primary text-primary-text" : "bg-surface ring-1 ring-border hover:bg-soft"}`}
          >
            <span aria-hidden>{a.icon}</span> {t(`animals.${a.id}`)}
          </Link>
        ))}
      </nav>

      {!inFarm && <p className="rounded-2xl bg-soft p-3 text-sm">{t("animalPage.notInFarm")}</p>}
      <h1 className="font-display text-4xl font-bold">{t(`animals.${id}`)}</h1>
      <nav className="flex gap-2 overflow-x-auto border-b border-border" aria-label={t(`animals.${id}`)}>
        {[
          { href: `/animals/${id}`, label: t("diary.tabManual"), active: !showDiary },
          { href: `/animals/${id}?tab=diary`, label: t("diary.tabDiary"), active: showDiary },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 py-2 font-semibold whitespace-nowrap md:min-h-0 ${tab.active ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {showDiary ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{t("diary.title", { animal: t(`animals.${id}`) })}</h2>
          <DiaryForm animalId={id} today={new Date().toISOString().slice(0, 10)} owner={user.username} />
          {diary.length ? (
            <ul className="space-y-3">
              {diary.map((e) => (
                <li key={e.id} data-testid="diary-entry" className="flex items-start justify-between gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border [overflow-wrap:anywhere]">
                  <div>
                    <p className="text-sm text-accent">
                      <b>{formatDay(e.date, locale, "long")}</b> · {t(`diary.kinds.${e.kind}`)}
                      {e.animalName && <> · {e.animalName}</>}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{e.note}</p>
                  </div>
                  <form action={deleteDiaryAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" aria-label={t("diary.delete")} title={t("diary.delete")} className="min-h-11 min-w-11 rounded-full px-3 py-1 text-muted hover:bg-soft hover:text-danger md:min-h-0 md:min-w-0">
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("diary.empty")}</p>
          )}
        </section>
      ) : !content ? (
        <p className="text-muted">{t("animalPage.noContent")}</p>
      ) : (
        <>
          <p className="max-w-3xl text-lg">{tx(content.summary)}</p>

          <CountryNotes notes={content.countryNotes} countryCode={user.countryCode} />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <section className="md:col-span-2">
              <h2 className="font-display text-2xl font-bold">{t("animalPage.breeds")}</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {content.breeds.map((b) => (
                  <article key={b.name} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                    <p className="font-bold">{b.name}</p>
                    <p className="text-sm text-accent">{tx(b.purpose)}</p>
                    <p className="mt-1 text-sm">{tx(b.notes)}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="rounded-3xl bg-soft p-6">
              <h2 className="font-display text-2xl font-bold">{t("animalPage.idealTemp")}</h2>
              <p className="mt-2 font-display text-3xl font-bold">
                {t("animalPage.tempRange", { min: content.idealTemp.minC, max: content.idealTemp.maxC })}
              </p>
              <p className="mt-2 text-sm">{tx(content.idealTemp.notes)}</p>
            </section>
          </div>

          <section>
            <h2 className="font-display text-2xl font-bold">
              {t("animalPage.seasonalCare", { zone: t(`climate.${user.climateZone}`) })}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {SEASONS.map((s) => (
                <article
                  key={s}
                  data-testid={`season-card-${s}`}
                  className={`rounded-2xl p-4 ${s === current ? "bg-soft ring-2 ring-primary" : "bg-surface ring-1 ring-border"}`}
                >
                  <p className="font-bold">{t(`seasons.${s}`)}</p>
                  {s === current && (
                    <p data-testid="current-season" className="text-xs font-semibold text-primary">{t("seasons.current")}</p>
                  )}
                  <p className="mt-1 text-sm">{tx(content.seasonalCare[user.climateZone][s])}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="font-display text-2xl font-bold">{t("animalPage.feeding")}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {content.feeding.map((f, i) => <li key={i}>{tx(f)}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="font-display text-2xl font-bold">{t("animalPage.healthCare")}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {content.healthCare.map((h, i) => <li key={i}>{tx(h)}</li>)}
              </ul>
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-bold">{t("animalPage.diseases")}</h2>
            <VetWarning />
            {content.diseases.map((d, i) => (
              <article key={i} data-testid="disease" className="rounded-2xl bg-surface p-5 ring-1 ring-border">
                <h3 className="text-lg font-bold">{tx(d.name)}</h3>
                <dl className="mt-2 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div><dt className="font-semibold text-accent">{t("animalPage.signs")}</dt><dd>{tx(d.signs)}</dd></div>
                  <div><dt className="font-semibold text-accent">{t("animalPage.homeCare")}</dt><dd>{tx(d.homeCare)}</dd></div>
                  <div><dt className="font-semibold text-accent">{t("animalPage.vetCare")}</dt><dd>{tx(d.vetCare)}</dd></div>
                </dl>
              </article>
            ))}
          </section>

          <SourcesList sources={content.sources} />
        </>
      )}
    </section>
  );
}
