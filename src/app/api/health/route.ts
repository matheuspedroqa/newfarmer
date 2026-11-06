import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

/** Para o aviso de site fora do ar: 200 quando o site e o banco respondem, 503 quando o banco não responde. Não mostra detalhes. */
export async function GET() {
  const ok = await getDb()
    .then((db) => db.query("SELECT 1"))
    .then(() => true, () => false);
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
