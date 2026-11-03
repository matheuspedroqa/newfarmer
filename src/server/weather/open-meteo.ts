import "server-only";
import type { Locale } from "@/i18n/locales";
import { normalsFromDaily } from "../climate";
import type { CityResult, WeatherProvider } from "./types";

interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

export function createOpenMeteoProvider(
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): WeatherProvider {
  async function getJson<T>(url: URL): Promise<T> {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Open-Meteo respondeu ${response.status}`);
    return (await response.json()) as T;
  }

  return {
    async searchCities(query: string, locale: Locale): Promise<CityResult[]> {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", query);
      url.searchParams.set("count", "8");
      url.searchParams.set("language", locale);
      url.searchParams.set("format", "json");
      const body = await getJson<{ results?: GeocodingResult[] }>(url);
      return (body.results ?? []).map((r) => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        latitude: r.latitude,
        longitude: r.longitude,
        countryCode: r.country_code.toUpperCase(),
      }));
    },

    async getClimateNormals(latitude: number, longitude: number) {
      const endYear = now().getUTCFullYear() - 1;
      const url = new URL("https://archive-api.open-meteo.com/v1/archive");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("start_date", `${endYear - 9}-01-01`);
      url.searchParams.set("end_date", `${endYear}-12-31`);
      url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
      url.searchParams.set("timezone", "auto");
      const body = await getJson<{
        daily: { time: string[]; temperature_2m_mean: (number | null)[]; precipitation_sum: (number | null)[] };
      }>(url);
      return normalsFromDaily(body.daily);
    },

    async getForecast(latitude: number, longitude: number) {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("current", "temperature_2m,weather_code");
      url.searchParams.set(
        "daily",
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code",
      );
      url.searchParams.set("forecast_days", "5");
      url.searchParams.set("timezone", "auto");
      const body = await getJson<{
        current: { temperature_2m: number; weather_code: number };
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: (number | null)[];
          precipitation_sum: (number | null)[];
          weather_code: number[];
        };
      }>(url);
      return {
        current: { temperature: body.current.temperature_2m, weatherCode: body.current.weather_code },
        days: body.daily.time.map((date, i) => ({
          date,
          max: body.daily.temperature_2m_max[i],
          min: body.daily.temperature_2m_min[i],
          rainChance: body.daily.precipitation_probability_max[i] ?? null,
          rainMm: body.daily.precipitation_sum?.[i] ?? null,
          weatherCode: body.daily.weather_code[i],
        })),
      };
    },
  };
}
