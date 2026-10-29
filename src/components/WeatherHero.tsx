import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveLocale } from "@/i18n/locales";
import { formatDay, formatTime } from "@/lib/format";
import { describeWeather } from "@/lib/weather-codes";
import type { ForecastResult } from "@/server/forecast";

export async function WeatherHero({ result }: { result: ForecastResult }) {
  const t = await getTranslations("weather");
  const locale = resolveLocale(await getLocale());

  if (!result) {
    return (
      <section data-testid="weather-hero" className="col-span-2 row-span-2 flex items-center justify-center rounded-3xl bg-soft p-6 text-center">
        <p data-testid="weather-unavailable">{t("unavailable")}</p>
      </section>
    );
  }

  const now = describeWeather(result.forecast.current.weatherCode);
  return (
    <section
      data-testid="weather-hero"
      className="col-span-2 row-span-2 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#9cc58a] to-[#fbeedd] p-6 text-[#1f3a1c] dark:from-[#2c4a2a] dark:to-[#2b2316] dark:text-[#ece6d6]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold opacity-70">{t("now")}</p>
          <p className="font-display text-7xl font-bold">{Math.round(result.forecast.current.temperature)}°</p>
          <p>{t(now.key)}</p>
          {result.stale && (
            <p data-testid="weather-stale" className="mt-1 text-xs opacity-80">
              {t("updatedAt", { time: formatTime(result.fetchedAt, locale) })}
            </p>
          )}
        </div>
        <span className="text-7xl" aria-hidden>{now.icon}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {result.forecast.days.map((day) => (
          <div key={day.date} className="rounded-2xl bg-white/50 p-2 text-center dark:bg-black/25">
            <p className="text-xs font-bold capitalize">{formatDay(day.date, locale, "short")}</p>
            <p className="text-xl" aria-hidden>{describeWeather(day.weatherCode).icon}</p>
            <p className="text-sm">{Math.round(day.max)}°/{Math.round(day.min)}°</p>
            {day.rainChance !== null && <p className="text-[10px] opacity-70">💧 {day.rainChance}%</p>}
          </div>
        ))}
      </div>
      <Link href="/clima" className="text-right text-xs font-semibold underline-offset-2 hover:underline">{t("seeAll")} →</Link>
    </section>
  );
}
