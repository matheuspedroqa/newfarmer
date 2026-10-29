export type ClimateZone = "tropical" | "subtropical" | "temperate" | "semiarid" | "cold";
export type Hemisphere = "south" | "north";

export interface ClimateNormals {
  monthlyMeanTemp: number[];
  annualPrecip: number;
}

export interface ResolvedClimate {
  zone: ClimateZone;
  estimated: boolean;
  hemisphere: Hemisphere;
}

export function classifyClimate({ monthlyMeanTemp, annualPrecip }: ClimateNormals): ClimateZone {
  if (monthlyMeanTemp.length !== 12) throw new Error("classifyClimate precisa de 12 médias mensais");
  const coldest = Math.min(...monthlyMeanTemp);
  const annualMean = monthlyMeanTemp.reduce((a, b) => a + b, 0) / 12;

  if (annualPrecip < 20 * annualMean + 140) return "semiarid";
  if (coldest >= 18) return "tropical";
  if (coldest <= -3) return "cold";
  if (coldest >= 8) return "subtropical";
  return "temperate";
}

export function hemisphereFor(latitude: number): Hemisphere {
  return latitude < 0 ? "south" : "north";
}

export function estimateZoneByLatitude(latitude: number): ClimateZone {
  const abs = Math.abs(latitude);
  if (abs < 23.5) return "tropical";
  if (abs < 35) return "subtropical";
  if (abs < 55) return "temperate";
  return "cold";
}

export function normalsFromDaily(daily: {
  time: string[];
  temperature_2m_mean: (number | null)[];
  precipitation_sum: (number | null)[];
}): ClimateNormals {
  const tempSum = Array(12).fill(0);
  const tempCount = Array(12).fill(0);
  let rainTotal = 0;
  const years = new Set<string>();

  daily.time.forEach((day, i) => {
    years.add(day.slice(0, 4));
    const month = Number(day.slice(5, 7)) - 1;
    const t = daily.temperature_2m_mean[i];
    if (t !== null && t !== undefined) {
      tempSum[month] += t;
      tempCount[month] += 1;
    }
    rainTotal += daily.precipitation_sum[i] ?? 0;
  });

  return {
    monthlyMeanTemp: tempSum.map((s, m) => (tempCount[m] ? s / tempCount[m] : NaN)),
    annualPrecip: rainTotal / years.size,
  };
}
