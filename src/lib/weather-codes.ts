export type WeatherKey = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "showers" | "thunder";

// Códigos WMO usados pelo Open-Meteo: https://open-meteo.com/en/docs (seção "WMO Weather interpretation codes").
export function describeWeather(code: number): { icon: string; key: WeatherKey } {
  if (code === 0) return { key: "clear", icon: "☀️" };
  if (code === 1 || code === 2) return { key: "partlyCloudy", icon: "⛅" };
  if (code === 45 || code === 48) return { key: "fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { key: "drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { key: "rain", icon: "🌧️" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { key: "snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { key: "showers", icon: "🌦️" };
  if (code >= 95 && code <= 99) return { key: "thunder", icon: "⛈️" };
  return { key: "cloudy", icon: "☁️" };
}
