import { normalizeUsername } from "@/lib/username";
import { getDb } from "@/server/db";

/** Só para os robôs (E2E): transforma uma conta em dono do site. Fora disso, 404. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.E2E !== "1") return new Response(null, { status: 404 });
  // Só JSON: um formulário de outro site (sem CORS) não consegue mandar application/json.
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
  if (typeof body?.username !== "string") return new Response(null, { status: 400 });
  const changed = await (await getDb()).run("UPDATE users SET is_platform_admin = TRUE WHERE username = $1", [
    normalizeUsername(body.username),
  ]);
  return new Response(null, { status: changed ? 204 : 404 });
}
