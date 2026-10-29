import type { CityChoice } from "@/lib/validation";
import type { Locale } from "@/i18n/locales";
import type { ClimateNormals } from "../climate";

export type CityResult = CityChoice;

export interface WeatherProvider {
  searchCities(query: string, locale: Locale): Promise<CityResult[]>;
  getClimateNormals(latitude: number, longitude: number): Promise<ClimateNormals>;
}
