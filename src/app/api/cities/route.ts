import { NextResponse, type NextRequest } from "next/server";
import { resolveLocale } from "@/i18n/locales";
import { logSafely } from "@/server/activity-log";
import { getDb } from "@/server/db";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { getWeatherProvider } from "@/server/weather";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  if (query.length < 2) return NextResponse.json([]);
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "citySearch", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "citySearch" }, ip });
    return NextResponse.json(
      { error: "rateLimited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }
  try {
    return NextResponse.json(await getWeatherProvider().searchCities(query.slice(0, 100), locale));
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
