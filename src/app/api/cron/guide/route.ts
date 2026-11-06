import { appUrl } from "@/server/app-url";
import { isAuthorized } from "@/server/cron-forecast";
import { getDb } from "@/server/db";
import { sendMonthlyGuides } from "@/server/guide-newsletter";
import { getMailer } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Cron diário da Vercel: o e-mail mensal "o que plantar" (vercel.json).
export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  const db = await getDb();
  const result = await sendMonthlyGuides(db, getMailer(db), { appUrl: appUrl() });
  return Response.json({ ok: result.failed === 0, ...result }, { status: result.failed ? 502 : 200 });
}
