import { NextResponse, type NextRequest } from "next/server";
import { resolveLocale } from "@/i18n/locales";
import { getWeatherProvider } from "@/server/weather";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  if (query.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await getWeatherProvider().searchCities(query.slice(0, 100), locale));
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
