import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { WeatherHero } from "@/components/WeatherHero";
import { resolveLocale } from "@/i18n/locales";
import { formatDay } from "@/lib/format";
import { ANIMALS, CROPS } from "@/lib/catalog";
import { monthlyTasks, seasonFor } from "@/lib/seasons";
import { getAllCropContent, getAnimalContent } from "@/server/content";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { listDiary } from "@/server/diary";
import { getFarm } from "@/server/farm";
import { getForecast } from "@/server/forecast";
import { getWeatherProvider } from "@/server/weather";

const TILE_COLORS = [
  "bg-[#fbeedd] dark:bg-[#2b2316]",
  "bg-[#e3eed8] dark:bg-[#1f2a1b]",
  "bg-[#f3e2c7] dark:bg-[#33281a]",
];

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const db = await getDb();
  const farm = await getFarm(db, user.id);
  const forecast = await getForecast(db, getWeatherProvider(), user.latitude, user.longitude);
  const icon = (id: string) => ANIMALS.find((a) => a.id === id)!.icon;
  const locale = resolveLocale(await getLocale());
  const month = new Date().getMonth() + 1;
  const season = seasonFor(month, user.hemisphere);
  const tasks = monthlyTasks(
    getAllCropContent().filter((c) => farm.crops.includes(c.id)),
    user.climateZone,
    user.hemisphere,
    month,
  );
  const recentNotes = await listDiary(db, user.id, { limit: 3 });
  const tips = farm.animals
    .map((a) => ({ id: a.id, content: getAnimalContent(a.id) }))
    .filter((a) => a.content)
    .map((a) => ({ id: a.id, text: a.content!.seasonalCare[user.climateZone][season][locale] }));

  return (
    <section>
      <h1 className="font-display text-3xl font-bold">{t("dashboard.hello", { name: user.name })}</h1>
      <div className="mt-6 grid auto-rows-[minmax(150px,auto)] grid-cols-4 gap-4">
        <WeatherHero result={forecast} />

        {farm.animals.map((animal, i) => (
          <section
            key={animal.id}
            data-testid={`animal-tile-${animal.id}`}
            className={`flex flex-col justify-between rounded-3xl p-5 ${TILE_COLORS[i % TILE_COLORS.length]}`}
          >
            <span className="text-4xl" aria-hidden>{icon(animal.id)}</span>
            <div>
              <p className="font-display text-4xl font-bold">{animal.count}</p>
              <p className="text-sm opacity-70">{t(`animals.${animal.id}`)}</p>
            </div>
          </section>
        ))}

        <Link
          href="/myfarm"
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/30 text-center text-primary hover:bg-soft"
        >
          <span className="text-3xl" aria-hidden>＋</span>
          <span className="text-sm">{farm.animals.length ? t("dashboard.addAnimal") : t("dashboard.noAnimals")}</span>
        </Link>

        <section data-testid="crop-chips" className="col-span-4 rounded-3xl bg-surface p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("dashboard.myCrops")}</p>
            <Link href="/myfarm" className="text-sm text-primary hover:underline">{t("dashboard.editFarm")}</Link>
          </div>
          {farm.crops.length ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {farm.crops.map((id) => (
                  <span key={id} className="rounded-full bg-bg px-4 py-2">
                    <span aria-hidden>{CROPS.find((c) => c.id === id)!.icon}</span> <b>{t(`crops.${id}`)}</b>
                  </span>
                ))}
              </div>
              <div data-testid="monthly-tasks" className="mt-5">
                <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("dashboard.thisMonth")}</p>
                {tasks.length ? (
                  <ul className="mt-2 space-y-1">
                    {tasks.map((task) => (
                      <li key={task.cropId}>
                        <span aria-hidden>{CROPS.find((c) => c.id === task.cropId)!.icon}</span>{" "}
                        <b>{t(`crops.${task.cropId}`)}</b> · {task.activities.map((a) => t(`activities.${a}`)).join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted">{t("dashboard.nothingThisMonth")}</p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-muted">{t("dashboard.noCrops")}</p>
          )}
        </section>

        <section data-testid="season-tip" className="col-span-4 rounded-3xl bg-primary p-6 text-primary-text">
          <p className="font-bold">🍂 {t("dashboard.seasonTip", { season: t(`seasons.${season}`) })}</p>
          {tips.length ? (
            <ul className="mt-2 space-y-1">
              {tips.map((tip) => (
                <li key={tip.id}>
                  <span aria-hidden>{icon(tip.id)}</span> <b>{t(`animals.${tip.id}`)}:</b> {tip.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 opacity-90">{t("dashboard.seasonTipEmpty")}</p>
          )}
        </section>

        {recentNotes.length > 0 && (
          <section data-testid="diary-recent" className="col-span-4 rounded-3xl bg-surface p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("dashboard.diaryRecent")}</p>
            <ul className="mt-2 space-y-1">
              {recentNotes.map((e) => (
                <li key={e.id}>
                  <Link href={`/animais/${e.animalId}?aba=diario`} className="hover:underline">
                    <span aria-hidden>{icon(e.animalId)}</span> <b>{formatDay(e.date, locale, "long")}</b> ·{" "}
                    {t(`diary.kinds.${e.kind}`)}{e.animalName && ` · ${e.animalName}`}: {e.note}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
