import { NextResponse, type NextRequest } from "next/server";
import { resolveLocale } from "@/i18n/locales";
import { getDb } from "@/server/db";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { getWeatherProvider } from "@/server/weather";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  if (query.length < 2) return NextResponse.json([]);
  const limit = await limitByIp(await getDb(), "citySearch", await clientIp());
  if (!limit.ok) {
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
