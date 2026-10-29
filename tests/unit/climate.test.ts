import { describe, expect, it } from "vitest";
import {
  classifyClimate,
  estimateZoneByLatitude,
  hemisphereFor,
  normalsFromDaily,
} from "@/server/climate";

const flat = (t: number) => Array(12).fill(t);

describe("classifyClimate", () => {
  it("tropical: mês mais frio com 18 °C ou mais", () => {
    expect(classifyClimate({ monthlyMeanTemp: flat(26), annualPrecip: 1500 })).toBe("tropical");
  });

  it("semiárido: pouca chuva para a temperatura, mesmo sendo quente", () => {
    // limite = 20 × 26 + 140 = 660 mm
    expect(classifyClimate({ monthlyMeanTemp: flat(26), annualPrecip: 500 })).toBe("semiarid");
  });

  it("subtropical: mês mais frio entre 8 e 18 °C (perfil de Curitiba)", () => {
    const curitiba = [21, 21, 20, 17, 15, 13, 13, 14, 15, 17, 19, 20];
    expect(classifyClimate({ monthlyMeanTemp: curitiba, annualPrecip: 1400 })).toBe("subtropical");
  });

  it("temperado: mês mais frio entre -3 e 8 °C (perfil de Paris)", () => {
    const paris = [5, 6, 9, 12, 16, 19, 21, 21, 17, 13, 8, 5];
    expect(classifyClimate({ monthlyMeanTemp: paris, annualPrecip: 640 })).toBe("temperate");
  });

  it("frio: mês mais frio com -3 °C ou menos", () => {
    const cold = [-10, -8, -2, 5, 12, 17, 20, 18, 12, 5, -2, -8];
    expect(classifyClimate({ monthlyMeanTemp: cold, annualPrecip: 600 })).toBe("cold");
  });

  it("limites exatos: 18 → tropical, 8 → subtropical, -3 → frio", () => {
    expect(classifyClimate({ monthlyMeanTemp: [18, ...flat(25).slice(1)], annualPrecip: 3000 })).toBe("tropical");
    expect(classifyClimate({ monthlyMeanTemp: [8, ...flat(20).slice(1)], annualPrecip: 3000 })).toBe("subtropical");
    expect(classifyClimate({ monthlyMeanTemp: [-3, ...flat(15).slice(1)], annualPrecip: 3000 })).toBe("cold");
  });

  it("recusa dados sem 12 meses", () => {
    expect(() => classifyClimate({ monthlyMeanTemp: [20, 20], annualPrecip: 1000 })).toThrow();
  });
});

describe("hemisphereFor", () => {
  it("latitude negativa é hemisfério sul", () => expect(hemisphereFor(-22.9)).toBe("south"));
  it("latitude positiva é hemisfério norte", () => expect(hemisphereFor(38.7)).toBe("north"));
  it("linha do equador conta como norte", () => expect(hemisphereFor(0)).toBe("north"));
});

describe("estimateZoneByLatitude", () => {
  it.each([
    [-1, "tropical"],
    [23.4, "tropical"],
    [23.5, "subtropical"],
    [-30, "subtropical"],
    [-45, "temperate"],
    [54.9, "temperate"],
    [60, "cold"],
  ] as const)("latitude %s → %s", (lat, zone) => {
    expect(estimateZoneByLatitude(lat)).toBe(zone);
  });
});

describe("normalsFromDaily", () => {
  it("faz média por mês e divide a chuva pelo número de anos, ignorando dias sem dado", () => {
    const time: string[] = [];
    const temp: (number | null)[] = [];
    const rain: (number | null)[] = [];
    for (const year of [2020, 2021]) {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        time.push(`${year}-${mm}-01`, `${year}-${mm}-02`);
        temp.push(m, null);
        rain.push(10, null);
      }
    }
    const n = normalsFromDaily({ time, temperature_2m_mean: temp, precipitation_sum: rain });
    expect(n.monthlyMeanTemp).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(n.annualPrecip).toBe(120);
  });
});
