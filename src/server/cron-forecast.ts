import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Db } from "./db";
import { recordTomorrowForecast } from "./forecast-snapshot";
import type { WeatherProvider } from "./weather/types";

export function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function handleCron(request: Request, deps: { db: Db | (() => Promise<Db>); provider: WeatherProvider }): Promise<Response> {
  if (!isAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  try {
    const date = await recordTomorrowForecast(typeof deps.db === "function" ? await deps.db() : deps.db, deps.provider, Date.now());
    return Response.json({ ok: true, date });
  } catch (error) {
    console.error("cron/forecast falhou", error);
    return Response.json({ ok: false }, { status: 502 });
  }
}
