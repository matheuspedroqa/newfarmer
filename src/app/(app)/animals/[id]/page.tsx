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
import type { Text } from "@/lib/content-schema";
import { seasonFor, type Season } from "@/lib/seasons";
import { formatDay } from "@/lib/format";
import { getAnimalContent } from "@/server/content";
import { requireAccess } from "@/server/current-user";
import { getDb } from "@/server/db";
import { listDiary } from "@/server/diary";
import { getFarm } from "@/server/farm";

const SEASONS: Season[] = ["summer", "autumn", "winter", "spring"];
const GUIDE_TABS = ["overview", "habitat", "feeding", "health", "breeding", "welfare"] as const;
type GuideTab = (typeof GUIDE_TABS)[number];

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
  const user = await requireAccess();
  const db = await getDb();
  const farm = await getFarm(db, user.id);
  const inFarm = farm.animals.some((a) => a.id === id);
  // Animal fora do MyFarm só abre se ainda houver anotações dele (links do Painel).
  if (!inFarm && !(await listDiary(db, user.id, { animalId: id as AnimalId, limit: 1 })).length) redirect("/animals");
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getAnimalContent(id as AnimalId);
  const current = seasonFor(new Date().getMonth() + 1, user.hemisphere);
  const tx = (v: Text) => v[locale];
  const diary = showDiary ? await listDiary(db, user.id, { animalId: id as AnimalId }) : [];
  const tab: GuideTab = (GUIDE_TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as GuideTab) : "overview";
  const tabHref = (g: GuideTab | "diary") => (g === "overview" ? `/animals/${id}` : `/animals/${id}?tab=${g}`);

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
          ...GUIDE_TABS.map((g) => ({ href: tabHref(g), label: t(`animalPage.tabs.${g}`), active: !showDiary && tab === g })),
          { href: tabHref("diary"), label: t("diary.tabDiary"), active: showDiary },
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
          {tab === "overview" && (
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

            </>
          )}
          {tab === "habitat" && (
            <>
              <Facts testId="habitat-facts" title={t("animalPage.habitat")} facts={content.habitat.facts.map((f) => [tx(f.label), tx(f.value)])} />
              <List title={t("animalPage.habitatTips")} items={content.habitat.tips.map(tx)} />
              {(
                <section data-testid="predators" className="space-y-3">
                  <h2 className="font-display text-2xl font-bold">{t("animalPage.predators")}</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {content.predators.threats.map((p, i) => (
                      <article key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                        <p className="font-bold">{tx(p.name)}</p>
                        <p className="mt-1 text-sm">{tx(p.signs)}</p>
                      </article>
                    ))}
                  </div>
                  <List title={t("animalPage.protection")} items={content.predators.protection.map(tx)} level={3} />
                </section>
              )}
            </>
          )}
          {tab === "feeding" && (
          <List title={t("animalPage.feeding")} items={content.feeding.map(tx)} />
          )}
          {tab === "health" && (
            <>
          <List title={t("animalPage.healthCare")} items={content.healthCare.map(tx)} />
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

            </>
          )}
          {tab === "breeding" && (
            <>
              <Facts testId="breeding-facts" title={t("animalPage.breeding")} facts={content.reproduction.facts.map((f) => [tx(f.label), tx(f.value)])} />
              <List title={t("animalPage.breedingTips")} items={content.reproduction.tips.map(tx)} />
            </>
          )}
          {tab === "welfare" && (
            <>
              <section data-testid="routine">
                <h2 className="font-display text-2xl font-bold">{t("animalPage.routine")}</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(["daily", "weekly", "monthly"] as const).map((k) => (
                    <article key={k} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                      <p className="font-bold">{t(`animalPage.${k}`)}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                        {content.welfare[k].map((x, i) => <li key={i}>{tx(x)}</li>)}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <List title={t("animalPage.happy")} items={content.welfare.happy.map(tx)} />
                <List title={t("animalPage.stressSigns")} items={content.welfare.stressSigns.map(tx)} />
              </div>
              <List title={t("animalPage.handling")} items={content.welfare.handling.map(tx)} />
            </>
          )}

          <SourcesList sources={content.sources} />
        </>
      )}
    </section>
  );
}

function List({ title, items, level = 2 }: { title: string; items: string[]; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <section>
      <H className={`font-display font-bold ${level === 2 ? "text-2xl" : "text-xl"}`}>{title}</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </section>
  );
}

/** Números-chave em cartões ("Ninhos" → "1 para cada 4–5 galinhas"). */
function Facts({ title, facts, testId }: { title: string; facts: [string, string][]; testId: string }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <dl data-testid={testId} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-soft p-4">
            <dt className="text-sm font-semibold text-accent">{label}</dt>
            <dd className="mt-1 font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
