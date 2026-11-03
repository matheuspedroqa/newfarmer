import { handleCron } from "@/server/cron-forecast";
import { getDb } from "@/server/db";
import { getWeatherProvider } from "@/server/weather";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCron(request, { db: await getDb(), provider: getWeatherProvider() });
}
