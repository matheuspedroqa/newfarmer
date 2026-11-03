import "server-only";
import type { Db } from "./db";
import type { Forecast, WeatherProvider } from "./weather/types";

export const FORECAST_TTL_MS = 60 * 60_000;

export type ForecastResult = { forecast: Forecast; fetchedAt: number; stale: boolean } | null;

export async function getForecast(
  db: Db,
  provider: WeatherProvider,
  latitude: number,
  longitude: number,
  now = Date.now(),
): Promise<ForecastResult> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const [cached] = await db.query<{ payload: string; fetched_at: number }>(
    "SELECT payload, fetched_at FROM weather_cache WHERE key = $1",
    [key],
  );
  if (cached && now - cached.fetched_at < FORECAST_TTL_MS) {
    return { forecast: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: false };
  }
  try {
    const forecast = await provider.getForecast(latitude, longitude);
    await db.run(
      `INSERT INTO weather_cache (key, payload, fetched_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
      [key, JSON.stringify(forecast), now],
    );
    return { forecast, fetchedAt: now, stale: false };
  } catch {
    return cached ? { forecast: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: true } : null;
  }
}
