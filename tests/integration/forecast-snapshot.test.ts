import { describe, expect, it } from "vitest";
import { recordTomorrowForecast } from "@/server/forecast-snapshot";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";

describe("recordTomorrowForecast", () => {
  it("grava o dia seguinte (UTC) do Fundão e rodar duas vezes deixa uma linha só", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider();
    const now = Date.parse("2026-11-03T00:00:05Z");
    // O falso devolve datas a partir de Date.now(); o provedor real devolve as datas locais.
    const days = [0, 1, 2].map((i) => new Date(now + i * 86_400_000).toISOString().slice(0, 10));
    const fixed = {
      ...provider,
      getForecast: async () => ({
        current: { temperature: 10, weatherCode: 0 },
        days: days.map((date, i) => ({ date, max: 20 + i, min: 10 + i, rainChance: 50, rainMm: i === 1 ? 3.2 : 0, weatherCode: 61 })),
      }),
    };
    expect(await recordTomorrowForecast(db, fixed, now)).toBe("2026-11-04");
    expect(await recordTomorrowForecast(db, fixed, now)).toBe("2026-11-04");
    const rows = await db.query<{ place: string; latitude: number; longitude: number; forecast_date: string; payload: unknown }>(
      "SELECT place, latitude, longitude, forecast_date, payload FROM forecast_snapshots",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ place: "Fundão", latitude: 40.1378, longitude: -7.5014, forecast_date: "2026-11-04" });
    expect(rows[0].payload).toEqual({ max: 21, min: 11, rainChance: 50, rainMm: 3.2, weatherCode: 61 });
  });

  it("falha se o provedor não traz o dia seguinte", async () => {
    const db = await testDb();
    const empty = { ...createFakeWeatherProvider(), getForecast: async () => ({ current: { temperature: 1, weatherCode: 0 }, days: [] }) };
    await expect(recordTomorrowForecast(db, empty, Date.now())).rejects.toThrow();
  });
});
