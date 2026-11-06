import { intlLocale, type Locale } from "@/i18n/locales";

export function formatDay(date: string, locale: Locale, style: "short" | "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { weekday: "short", timeZone: "UTC" }
      : { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(`${date}T00:00:00Z`));
}

/** "3,2 mm" no idioma da pessoa; null quando não choveu ou não há dado (previsões guardadas antigas não têm rainMm). */
export function formatRainMm(mm: number | null | undefined, locale: Locale): string | null {
  if (!mm || mm <= 0) return null;
  const n = new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mm);
  return `${n} mm`;
}

export function formatTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}
