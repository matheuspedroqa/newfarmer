import bcrypt from "bcryptjs";
import type { CityChoice } from "@/lib/validation";
import { resolveLocale, resolveTheme, type Locale, type Theme } from "@/i18n/locales";
import type { ClimateZone, Hemisphere, ResolvedClimate } from "./climate";
import type { Db } from "./db";

const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;
// Compared against when the e-mail does not exist, so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

export const MAX_FAILED_LOGINS = 5;
export const LOCK_WINDOW_MS = 15 * 60_000;

export class EmailTakenError extends Error {
  constructor() {
    super("E-mail already registered");
  }
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  city: CityChoice;
  climate: ResolvedClimate;
}

export interface User {
  id: number;
  name: string;
  email: string;
  cityLabel: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  climateZone: ClimateZone;
  climateEstimated: boolean;
  hemisphere: Hemisphere;
  locale: Locale;
  theme: Theme;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  city_label: string;
  latitude: number;
  longitude: number;
  country_code: string;
  climate_zone: ClimateZone;
  climate_estimated: number;
  hemisphere: Hemisphere;
  locale: string;
  theme: string;
}

export async function createUser(db: Db, user: NewUser, now = Date.now()): Promise<number> {
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
  try {
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, city_label, latitude, longitude, country_code,
          climate_zone, climate_estimated, hemisphere, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.name.trim(),
        user.email.trim().toLowerCase(),
        passwordHash,
        user.city.label,
        user.city.latitude,
        user.city.longitude,
        user.city.countryCode,
        user.climate.zone,
        user.climate.estimated ? 1 : 0,
        user.climate.hemisphere,
        now,
      );
    return Number(result.lastInsertRowid);
  } catch (error) {
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") throw new EmailTakenError();
    throw error;
  }
}

export function getUserById(db: Db, id: number): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cityLabel: row.city_label,
    latitude: row.latitude,
    longitude: row.longitude,
    countryCode: row.country_code,
    climateZone: row.climate_zone,
    climateEstimated: row.climate_estimated === 1,
    hemisphere: row.hemisphere,
    locale: resolveLocale(row.locale),
    theme: resolveTheme(row.theme),
  };
}

export type LoginResult = { ok: true; userId: number } | { ok: false; reason: "invalid" | "locked" };

export async function verifyCredentials(
  db: Db,
  email: string,
  password: string,
  now = Date.now(),
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  if (isLocked(db, normalized, now)) return { ok: false, reason: "locked" };

  const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(normalized) as
    | { id: number; password_hash: string }
    | undefined;
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  const ok = Boolean(row) && matches;

  db.prepare("INSERT INTO login_attempts (email, attempted_at, success) VALUES (?, ?, ?)").run(
    normalized,
    now,
    ok ? 1 : 0,
  );
  return ok ? { ok: true, userId: row!.id } : { ok: false, reason: "invalid" };
}

function isLocked(db: Db, email: string, now: number): boolean {
  const lastSuccess = db
    .prepare("SELECT MAX(attempted_at) AS t FROM login_attempts WHERE email = ? AND success = 1")
    .get(email) as { t: number | null };
  const since = Math.max(now - LOCK_WINDOW_MS, lastSuccess.t ?? 0);
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND success = 0 AND attempted_at > ?")
    .get(email, since) as { n: number };
  return n >= MAX_FAILED_LOGINS;
}

export async function setPassword(db: Db, userId: number, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}
