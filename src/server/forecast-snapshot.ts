import "server-only";
import type { Db } from "./db";
import type { WeatherProvider } from "./weather/types";

export const FUNDAO = { place: "Fundão", latitude: 40.1378, longitude: -7.5014 } as const;

/** Guarda a previsão do Fundão para o dia seguinte (UTC) ao `now`. Repetir no mesmo dia só atualiza a linha. */
export async function recordTomorrowForecast(db: Db, provider: WeatherProvider, now: number): Promise<string> {
  const date = new Date(now + 86_400_000).toISOString().slice(0, 10);
  const forecast = await provider.getForecast(FUNDAO.latitude, FUNDAO.longitude);
  const day = forecast.days.find((d) => d.date === date);
  if (!day) throw new Error(`Previsão sem o dia ${date}`);
  const payload = { max: day.max, min: day.min, rainChance: day.rainChance, rainMm: day.rainMm ?? null, weatherCode: day.weatherCode };
  await db.run(
    `INSERT INTO forecast_snapshots (place, latitude, longitude, forecast_date, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (place, forecast_date) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`,
    [FUNDAO.place, FUNDAO.latitude, FUNDAO.longitude, date, JSON.stringify(payload), now],
  );
  return date;
}
