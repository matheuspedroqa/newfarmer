import { describe, expect, it } from "vitest";
import { describeWeather } from "@/lib/weather-codes";

describe("describeWeather (códigos WMO do Open-Meteo)", () => {
  it.each([
    [0, "clear", "☀️"],
    [2, "partlyCloudy", "⛅"],
    [3, "cloudy", "☁️"],
    [45, "fog", "🌫️"],
    [53, "drizzle", "🌦️"],
    [63, "rain", "🌧️"],
    [73, "snow", "❄️"],
    [81, "showers", "🌦️"],
    [95, "thunder", "⛈️"],
  ])("código %i → %s", (code, key, icon) => {
    expect(describeWeather(code)).toEqual({ key, icon });
  });

  it("código desconhecido vira nublado", () => {
    expect(describeWeather(999).key).toBe("cloudy");
  });
});
