import { describe, expect, it, vi } from "vitest";
import { FORECAST_TTL_MS, getForecast } from "@/server/forecast";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import type { WeatherProvider } from "@/server/weather/types";
import { testDb } from "../helpers/db";

function spyProvider(options: { failForecast?: boolean } = {}) {
  const fake = createFakeWeatherProvider(options);
  const getForecastSpy = vi.fn(fake.getForecast);
  const provider: WeatherProvider = { ...fake, getForecast: getForecastSpy };
  return { provider, getForecastSpy };
}

describe("getForecast", () => {
  it("busca, guarda e usa a guardada por 1 hora", async () => {
    const db = testDb();
    const { provider, getForecastSpy } = spyProvider();
    const first = await getForecast(db, provider, -25.43, -49.27, 0);
    expect(first).toMatchObject({ stale: false, fetchedAt: 0 });
    expect(first!.forecast.days).toHaveLength(5);

    await getForecast(db, provider, -25.43, -49.27, FORECAST_TTL_MS - 1);
    expect(getForecastSpy).toHaveBeenCalledTimes(1);

    await getForecast(db, provider, -25.43, -49.27, FORECAST_TTL_MS + 1);
    expect(getForecastSpy).toHaveBeenCalledTimes(2);
  });

  it("coordenadas quase iguais usam a mesma previsão guardada", async () => {
    const db = testDb();
    const { provider, getForecastSpy } = spyProvider();
    await getForecast(db, provider, -25.4278, -49.2731, 0);
    await getForecast(db, provider, -25.4301, -49.2699, 10);
    expect(getForecastSpy).toHaveBeenCalledTimes(1);
  });

  it("serviço fora: devolve a guardada marcada como antiga", async () => {
    const db = testDb();
    await getForecast(db, spyProvider().provider, -25.43, -49.27, 0);
    const result = await getForecast(db, spyProvider({ failForecast: true }).provider, -25.43, -49.27, FORECAST_TTL_MS * 3);
    expect(result).toMatchObject({ stale: true, fetchedAt: 0 });
  });

  it("serviço fora e nada guardado: devolve null", async () => {
    const db = testDb();
    expect(await getForecast(db, spyProvider({ failForecast: true }).provider, -25.43, -49.27, 0)).toBeNull();
  });
});
