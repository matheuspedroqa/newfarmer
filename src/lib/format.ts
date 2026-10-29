import type { Locale } from "@/i18n/locales";

const intlLocale = (locale: Locale) => (locale === "pt" ? "pt-BR" : "en-US");

export function formatDay(date: string, locale: Locale, style: "short" | "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { weekday: "short", timeZone: "UTC" }
      : { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}
