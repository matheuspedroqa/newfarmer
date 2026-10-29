import { describe, expect, it } from "vitest";
import { createOpenMeteoProvider } from "@/server/weather/open-meteo";

describe("Open-Meteo de verdade", () => {
  const provider = createOpenMeteoProvider();

  it("encontra Campinas no Brasil", async () => {
    const cities = await provider.searchCities("Campinas", "pt");
    const br = cities.find((c) => c.countryCode === "BR" && c.label.includes("São Paulo"));
    expect(br).toBeDefined();
    expect(br!.latitude).toBeCloseTo(-22.9, 0);
  });

  it("devolve médias de 12 meses com chuva plausível", async () => {
    const normals = await provider.getClimateNormals(-22.9, -47.06);
    expect(normals.monthlyMeanTemp).toHaveLength(12);
    expect(normals.annualPrecip).toBeGreaterThan(500);
  });

  it("devolve previsão real de 5 dias", async () => {
    const forecast = await provider.getForecast(-22.9, -47.06);
    expect(forecast.days).toHaveLength(5);
    expect(typeof forecast.current.temperature).toBe("number");
  });
});
