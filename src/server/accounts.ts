import bcrypt from "bcryptjs";
import type { CityChoice } from "@/lib/validation";
import { resolveLocale, resolveTheme, type Locale, type Theme } from "@/i18n/locales";
import type { ClimateZone, Hemisphere, ResolvedClimate } from "./climate";
import type { Db } from "./db";
import { hashToken } from "./tokens";

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
  emailVerified: boolean;
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
  email_verified_at: number | null;
}

export async function createUser(db: Db, user: NewUser, now = Date.now()): Promise<number> {
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
  try {
    const [row] = await db.query<{ id: number }>(
      `INSERT INTO users (name, email, password_hash, city_label, latitude, longitude, country_code,
        climate_zone, climate_estimated, hemisphere, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
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
      ],
    );
    return row.id;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new EmailTakenError(); // unique_violation
    throw error;
  }
}

export async function getUserById(db: Db, id: number): Promise<User | null> {
  const [row] = await db.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
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
    emailVerified: row.email_verified_at !== null,
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
  if (await isLocked(db, normalized, now)) return { ok: false, reason: "locked" };

  const [row] = await db.query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [normalized],
  );
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  const ok = Boolean(row) && matches;

  await db.run("INSERT INTO login_attempts (email, attempted_at, success) VALUES ($1, $2, $3)", [
    normalized,
    now,
    ok ? 1 : 0,
  ]);
  return ok ? { ok: true, userId: row!.id } : { ok: false, reason: "invalid" };
}

async function isLocked(db: Db, email: string, now: number): Promise<boolean> {
  const [lastSuccess] = await db.query<{ t: number | null }>(
    "SELECT MAX(attempted_at) AS t FROM login_attempts WHERE email = $1 AND success = 1",
    [email],
  );
  const since = Math.max(now - LOCK_WINDOW_MS, lastSuccess.t ?? 0);
  const [{ n }] = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM login_attempts WHERE email = $1 AND success = 0 AND attempted_at > $2",
    [email, since],
  );
  return n >= MAX_FAILED_LOGINS;
}

export async function setPassword(db: Db, userId: number, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await db.run("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
}

export async function changePassword(
  db: Db,
  userId: number,
  currentPassword: string,
  newPassword: string,
  keepSessionToken?: string,
): Promise<"ok" | "wrongPassword"> {
  const [row] = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) return "wrongPassword";
  await setPassword(db, userId, newPassword);
  // Encerra as sessões abertas em outros lugares; a sessão de quem trocou a senha continua.
  await db.run("DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2", [
    userId,
    keepSessionToken ? hashToken(keepSessionToken) : "",
  ]);
  return "ok";
}
