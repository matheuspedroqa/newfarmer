import "server-only";
import type { CityChoice, SignupInput } from "@/lib/validation";
import { EmailTakenError, createUser, getUserById } from "./accounts";
import {
  classifyClimate,
  estimateZoneByLatitude,
  hemisphereFor,
  type ResolvedClimate,
} from "./climate";
import type { Db } from "./db";
import type { WeatherProvider } from "./weather/types";

export async function resolveClimate(
  provider: WeatherProvider,
  latitude: number,
  longitude: number,
): Promise<ResolvedClimate> {
  const hemisphere = hemisphereFor(latitude);
  try {
    const normals = await provider.getClimateNormals(latitude, longitude);
    return { zone: classifyClimate(normals), estimated: false, hemisphere };
  } catch {
    return { zone: estimateZoneByLatitude(latitude), estimated: true, hemisphere };
  }
}

export type RegisterResult = { ok: true; userId: number } | { ok: false; error: "emailTaken" };

export async function registerUser(db: Db, provider: WeatherProvider, input: SignupInput): Promise<RegisterResult> {
  const climate = await resolveClimate(provider, input.city.latitude, input.city.longitude);
  try {
    const userId = await createUser(db, { ...input, climate });
    return { ok: true, userId };
  } catch (error) {
    if (error instanceof EmailTakenError) return { ok: false, error: "emailTaken" };
    throw error;
  }
}

export async function changeCity(
  db: Db,
  provider: WeatherProvider,
  userId: number,
  city: CityChoice,
): Promise<ResolvedClimate> {
  const climate = await resolveClimate(provider, city.latitude, city.longitude);
  await db.run(
    `UPDATE users SET city_label = $1, latitude = $2, longitude = $3, country_code = $4,
      climate_zone = $5, climate_estimated = $6, hemisphere = $7 WHERE id = $8`,
    [
      city.label,
      city.latitude,
      city.longitude,
      city.countryCode,
      climate.zone,
      climate.estimated ? 1 : 0,
      climate.hemisphere,
      userId,
    ],
  );
  return climate;
}

export async function refreshEstimatedClimate(db: Db, provider: WeatherProvider, userId: number): Promise<void> {
  const user = await getUserById(db, userId);
  if (!user?.climateEstimated) return;
  const climate = await resolveClimate(provider, user.latitude, user.longitude);
  if (climate.estimated) return;
  await db.run("UPDATE users SET climate_zone = $1, climate_estimated = 0 WHERE id = $2", [climate.zone, userId]);
}
