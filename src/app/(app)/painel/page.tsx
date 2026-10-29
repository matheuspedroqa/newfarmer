import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { WeatherHero } from "@/components/WeatherHero";
import { ANIMALS, CROPS } from "@/lib/catalog";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";
import { getForecast } from "@/server/forecast";
import { getWeatherProvider } from "@/server/weather";

const TILE_COLORS = [
  "bg-[#fbeedd] dark:bg-[#2b2316]",
  "bg-[#e3eed8] dark:bg-[#1f2a1b]",
  "bg-[#f3e2c7] dark:bg-[#33281a]",
];

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  const db = getDb();
  const farm = getFarm(db, user.id);
  const forecast = await getForecast(db, getWeatherProvider(), user.latitude, user.longitude);
  const icon = (id: string) => ANIMALS.find((a) => a.id === id)!.icon;

  return (
    <section>
      <h1 className="font-display text-3xl font-bold">{t("dashboard.hello", { name: user.name })}</h1>
      <div className="mt-6 grid auto-rows-[150px] grid-cols-4 gap-4">
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
              <p className="mt-3 text-sm text-muted">{t("dashboard.cropsSoon")}</p>
            </>
          ) : (
            <p className="mt-3 text-muted">{t("dashboard.noCrops")}</p>
          )}
        </section>
      </div>
    </section>
  );
}
