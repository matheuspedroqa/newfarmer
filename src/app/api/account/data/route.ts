import { NextResponse } from "next/server";
import { exportUserData } from "@/server/account-data";
import { logSafely, logWriteLimited } from "@/server/activity-log";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";

export const dynamic = "force-dynamic";

// Só a pessoa logada baixa, e só os próprios dados: o id vem da sessão, nunca da URL.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    return NextResponse.json({ error: "rateLimited" }, { status: 429 });
  }
  const data = await exportUserData(db, user.id);
  await logSafely(db, { userId: user.id, action: "account.exported", target: user.username, ip });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="newfarmer-${user.username}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
