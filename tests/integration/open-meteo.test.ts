import { describe, expect, it, vi } from "vitest";
import { createOpenMeteoProvider } from "@/server/weather/open-meteo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Open-Meteo: searchCities", () => {
  it("monta 'Cidade, Estado, País' e pede no idioma certo", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          { name: "Campinas", admin1: "São Paulo", country: "Brasil", country_code: "br", latitude: -22.9, longitude: -47.06 },
          { name: "Campinas", country: "Brasil", country_code: "BR", latitude: -10, longitude: -40 },
        ],
      }),
    );
    const provider = createOpenMeteoProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.searchCities("Campinas", "pt");
    expect(result).toEqual([
      { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" },
      { label: "Campinas, Brasil", latitude: -10, longitude: -40, countryCode: "BR" },
    ]);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.hostname).toBe("geocoding-api.open-meteo.com");
    expect(url.searchParams.get("name")).toBe("Campinas");
    expect(url.searchParams.get("language")).toBe("pt");
  });

  it("devolve lista vazia quando não acha nada", async () => {
    const provider = createOpenMeteoProvider((async () => jsonResponse({})) as unknown as typeof fetch);
    expect(await provider.searchCities("xyzxyz", "en")).toEqual([]);
  });

  it("dá erro quando o serviço falha", async () => {
    const provider = createOpenMeteoProvider((async () => jsonResponse({}, 500)) as unknown as typeof fetch);
    await expect(provider.searchCities("Campinas", "pt")).rejects.toThrow();
  });
});

describe("Open-Meteo: getClimateNormals", () => {
  it("pede os últimos 10 anos completos e calcula as médias", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        daily: {
          time: ["2016-01-01", "2016-07-01"],
          temperature_2m_mean: [25, 15],
          precipitation_sum: [800, 400],
        },
      }),
    );
    const provider = createOpenMeteoProvider(fetchMock as unknown as typeof fetch, () => new Date("2026-10-29"));
    const normals = await provider.getClimateNormals(-22.9, -47.06);
    expect(normals.monthlyMeanTemp[0]).toBe(25);
    expect(normals.monthlyMeanTemp[6]).toBe(15);
    expect(normals.annualPrecip).toBe(1200);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.hostname).toBe("archive-api.open-meteo.com");
    expect(url.searchParams.get("start_date")).toBe("2016-01-01");
    expect(url.searchParams.get("end_date")).toBe("2025-12-31");
  });
});
