import { createFakeWeatherProvider } from "./fake";
import { createOpenMeteoProvider } from "./open-meteo";
import type { WeatherProvider } from "./types";

let provider: WeatherProvider | undefined;

export function getWeatherProvider(): WeatherProvider {
  provider ??= process.env.WEATHER_FAKE === "1" ? createFakeWeatherProvider() : createOpenMeteoProvider();
  return provider;
}
