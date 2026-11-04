import { getDb } from "@/server/db";

/** Só para os robôs (E2E): devolve as visitas gravadas de um visitante. Fora disso, 404. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.E2E !== "1") return new Response(null, { status: 404 });
  const visitor = new URL(request.url).searchParams.get("visitor") ?? "";
  const rows = await (await getDb()).query("SELECT path, referrer FROM page_views WHERE visitor_id = $1 ORDER BY id", [visitor]);
  return Response.json(rows);
}
