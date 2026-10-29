import type { SignupInput } from "@/lib/validation";
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

export async function refreshEstimatedClimate(db: Db, provider: WeatherProvider, userId: number): Promise<void> {
  const user = getUserById(db, userId);
  if (!user?.climateEstimated) return;
  const climate = await resolveClimate(provider, user.latitude, user.longitude);
  if (climate.estimated) return;
  db.prepare("UPDATE users SET climate_zone = ?, climate_estimated = 0 WHERE id = ?").run(climate.zone, userId);
}
