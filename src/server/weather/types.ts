import type { CityChoice } from "@/lib/validation";
import type { Locale } from "@/i18n/locales";
import type { ClimateNormals } from "../climate";

export type CityResult = CityChoice;

export interface DayForecast {
  date: string;
  max: number;
  min: number;
  rainChance: number | null;
  weatherCode: number;
}

export interface Forecast {
  current: { temperature: number; weatherCode: number };
  days: DayForecast[];
}

export interface WeatherProvider {
  searchCities(query: string, locale: Locale): Promise<CityResult[]>;
  getClimateNormals(latitude: number, longitude: number): Promise<ClimateNormals>;
  getForecast(latitude: number, longitude: number): Promise<Forecast>;
}
