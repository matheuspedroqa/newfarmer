import { expect, it } from "vitest";
import { shouldUseFakeWeather } from "@/server/weather";

it("WEATHER_FAKE só vale fora de produção", () => {
  expect(shouldUseFakeWeather({ WEATHER_FAKE: "1", NODE_ENV: "development" })).toBe(true);
  expect(shouldUseFakeWeather({ WEATHER_FAKE: "1", NODE_ENV: "production" })).toBe(false);
  expect(shouldUseFakeWeather({ NODE_ENV: "development" })).toBe(false);
});
