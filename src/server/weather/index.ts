import "server-only";
import { createFakeWeatherProvider } from "./fake";
import { createOpenMeteoProvider } from "./open-meteo";
import type { WeatherProvider } from "./types";

let provider: WeatherProvider | undefined;

/** O clima falso é só para desenvolvimento e testes; em produção a variável é ignorada. */
export function shouldUseFakeWeather(env: Record<string, string | undefined> = process.env): boolean {
  return env.WEATHER_FAKE === "1" && env.NODE_ENV !== "production";
}

export function getWeatherProvider(): WeatherProvider {
  provider ??= shouldUseFakeWeather() ? createFakeWeatherProvider() : createOpenMeteoProvider();
  return provider;
}
