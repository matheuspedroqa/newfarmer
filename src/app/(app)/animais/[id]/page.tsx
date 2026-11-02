import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryNotes } from "@/components/CountryNotes";
import { SourcesList } from "@/components/SourcesList";
import { VetWarning } from "@/components/VetWarning";
import { resolveLocale } from "@/i18n/locales";
import { ANIMALS, ANIMAL_IDS, type AnimalId } from "@/lib/catalog";
import { seasonFor, type Season } from "@/lib/seasons";
import { getAnimalContent } from "@/server/content";
import { requireUser } from "@/server/current-user";

const SEASONS: Season[] = ["summer", "autumn", "winter", "spring"];

export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(ANIMAL_IDS as readonly string[]).includes(id)) notFound();
  const user = await requireUser();
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getAnimalContent(id as AnimalId);
  const current = seasonFor(new Date().getMonth() + 1, user.hemisphere);
  const tx = (v: { pt: string; en: string }) => v[locale];

  return (
    <section className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label={t("nav.animals")}>
        {ANIMALS.map((a) => (
          <Link
            key={a.id}
            href={`/animais/${a.id}`}
            data-testid={`animal-tab-${a.id}`}
            aria-current={a.id === id ? "page" : undefined}
            className={`rounded-full px-4 py-2 ${a.id === id ? "bg-primary text-primary-text" : "bg-surface ring-1 ring-border hover:bg-soft"}`}
          >
            <span aria-hidden>{a.icon}</span> {t(`animals.${a.id}`)}
          </Link>
        ))}
      </nav>

      <h1 className="font-display text-4xl font-bold">{t(`animals.${id}`)}</h1>
      {!content ? (
        <p className="text-muted">{t("animalPage.noContent")}</p>
      ) : (
        <>
          <p className="max-w-3xl text-lg">{tx(content.summary)}</p>

          <CountryNotes notes={content.countryNotes} countryCode={user.countryCode} />

          <div className="grid grid-cols-3 gap-6">
            <section className="col-span-2">
              <h2 className="font-display text-2xl font-bold">{t("animalPage.breeds")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
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
            <div className="mt-3 grid grid-cols-4 gap-3">
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

          <div className="grid grid-cols-2 gap-6">
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
                <dl className="mt-2 grid grid-cols-3 gap-4 text-sm">
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
