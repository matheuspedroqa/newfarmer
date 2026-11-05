import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PriceCard } from "@/components/PriceCard";
import { ShowcaseToggle } from "@/components/ShowcaseToggle";
import { resolveLocale } from "@/i18n/locales";
import { marketingAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("tryMetaTitle"), description: t("tryDescription"), alternates: marketingAlternates("/try", "en") };
}

const SHOTS = [
  { name: "dashboard", card: "count", path: "/dashboard" },
  { name: "animal", card: "diary", path: "/animals/chickens" },
  { name: "weather", card: "weather", path: "/weather" },
] as const;
const STEPS = ["one", "two", "three", "four"] as const;

export default async function TryPage() {
  const t = await getTranslations("home");
  const locale = resolveLocale(await getLocale());
  const img = (name: string, device: "desktop" | "mobile") => `/screenshots/${locale}-${name}-${device}.png`;

  return (
    <>
      <section className="mx-auto max-w-6xl overflow-x-clip px-5 pt-12 pb-16 md:px-8">
        <h1 className="text-center font-display text-4xl font-bold text-primary md:text-5xl">{t("tryTitle")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted">{t("trySub")}</p>
        <ShowcaseToggle
          labels={{ desktop: t("desktop"), mobile: t("mobile") }}
          shots={SHOTS.map((s) => ({
            name: s.name,
            card: { icon: t(`cards.${s.card}.icon`), title: t(`cards.${s.card}.title`), text: t(`cards.${s.card}.text`) },
            src: { desktop: img(s.name, "desktop"), mobile: img(s.name, "mobile") },
            alt: t(`alts.${s.name}`),
            caption: t(`shots.${s.name}`),
          }))}
        />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="text-center font-display text-3xl font-bold">{t("stepsTitle")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("stepsSub")}</p>
        <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((k, i) => (
            <li key={k} className="relative flex flex-col rounded-3xl bg-surface p-6 ring-1 ring-border">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-text">{i + 1}</span>
                <span aria-hidden className="text-3xl">{t(`steps.${k}.icon`)}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{t(`steps.${k}.title`)}</h3>
              <p className="mt-2 text-muted">{t(`steps.${k}.text`)}</p>
              <p className="mt-auto pt-4 text-sm font-semibold text-accent">{t(`steps.${k}.note`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <PriceCard />
    </>
  );
}
