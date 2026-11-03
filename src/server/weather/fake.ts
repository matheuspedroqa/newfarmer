import "server-only";
import type { ClimateNormals } from "../climate";
import type { CityResult, WeatherProvider } from "./types";

const CITIES: { city: CityResult; normals: ClimateNormals }[] = [
  {
    city: { label: "Campinas, São Paulo, Brasil", latitude: -22.91, longitude: -47.06, countryCode: "BR" },
    normals: { monthlyMeanTemp: Array(12).fill(23), annualPrecip: 1400 },
  },
  {
    city: { label: "Curitiba, Paraná, Brasil", latitude: -25.43, longitude: -49.27, countryCode: "BR" },
    normals: { monthlyMeanTemp: [21, 21, 20, 17, 15, 13, 13, 14, 15, 17, 19, 20], annualPrecip: 1400 },
  },
  {
    city: { label: "Lisboa, Lisboa, Portugal", latitude: 38.72, longitude: -9.14, countryCode: "PT" },
    normals: { monthlyMeanTemp: [11, 12, 14, 15, 18, 21, 23, 23, 22, 18, 14, 12], annualPrecip: 700 },
  },
];

const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function createFakeWeatherProvider(
  options: { failNormals?: boolean; failForecast?: boolean } = {},
): WeatherProvider {
  return {
    async searchCities(query) {
      return CITIES.filter((c) => plain(c.city.label).includes(plain(query))).map((c) => c.city);
    },
    async getClimateNormals(latitude, longitude) {
      if (options.failNormals) throw new Error("serviço de clima fora (falso)");
      const match = CITIES.find((c) => c.city.latitude === latitude && c.city.longitude === longitude);
      return match?.normals ?? CITIES[0].normals;
    },
    async getForecast() {
      if (options.failForecast) throw new Error("serviço de previsão fora (falso)");
      const today = Date.now();
      const days = [
        [22, 13, 40, 2],
        [19, 12, 85, 61],
        [20, 11, 55, 80],
        [25, 12, 5, 0],
        [27, 14, 0, 0],
      ].map(([max, min, rainChance, weatherCode], i) => ({
        date: new Date(today + i * 86_400_000).toISOString().slice(0, 10),
        max,
        min,
        rainChance,
        weatherCode,
      }));
      return { current: { temperature: 18, weatherCode: 2 }, days };
    },
  };
}
