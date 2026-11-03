import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { formatDay, formatRainMm, formatTime } from "@/lib/format";
import { describeWeather } from "@/lib/weather-codes";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getForecast } from "@/server/forecast";
import { getWeatherProvider } from "@/server/weather";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("nav.weather") };
}

export default async function WeatherPage() {
  const user = await requireUser();
  const t = await getTranslations("weather");
  const locale = resolveLocale(await getLocale());
  const result = await getForecast((await getDb()), getWeatherProvider(), user.latitude, user.longitude);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
        <p className="text-muted">{user.cityLabel}</p>
      </div>
      {!result ? (
        <p data-testid="weather-unavailable" role="status" className="rounded-2xl bg-soft p-6">{t("unavailable")}</p>
      ) : (
        <>
          {result.stale && (
            <p data-testid="weather-stale" role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm">
              {t("updatedAt", { time: formatTime(result.fetchedAt, locale) })}
            </p>
          )}
          <div className="flex items-center gap-6 rounded-3xl bg-gradient-to-br from-[#9cc58a] to-[#fbeedd] p-8 text-[#1f3a1c] dark:from-[#2c4a2a] dark:to-[#2b2316] dark:text-[#ece6d6]">
            <span className="text-7xl" aria-hidden>{describeWeather(result.forecast.current.weatherCode).icon}</span>
            <div>
              <p className="text-sm font-semibold opacity-70">{t("now")}</p>
              <p className="font-display text-6xl font-bold">{Math.round(result.forecast.current.temperature)}°</p>
              <p>{t(describeWeather(result.forecast.current.weatherCode).key)}</p>
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold">{t("next5")}</h2>
          <div className="grid grid-cols-5 gap-4">
            {result.forecast.days.map((day) => {
              const w = describeWeather(day.weatherCode);
              return (
                <article key={day.date} data-testid="day-card" className="rounded-3xl bg-surface p-5 text-center ring-1 ring-border">
                  <p className="font-bold capitalize">{formatDay(day.date, locale, "long")}</p>
                  <p className="my-3 text-5xl" aria-hidden>{w.icon}</p>
                  <p className="text-sm text-muted">{t(w.key)}</p>
                  <p className="mt-2">
                    <span className="font-bold">{t("max")} {Math.round(day.max)}°</span>{" "}
                    <span className="text-muted">{t("min")} {Math.round(day.min)}°</span>
                  </p>
                  {day.rainChance !== null && <p className="text-sm text-muted">💧 {t("rainChance")} {day.rainChance}%</p>}
                  {formatRainMm(day.rainMm, locale) && <p className="text-sm text-muted">💧 {formatRainMm(day.rainMm, locale)}</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
