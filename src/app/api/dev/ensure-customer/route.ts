import { normalizeUsername } from "@/lib/username";
import { getDb } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { ensureCustomer } from "@/server/subscriptions";

/** Só para os robôs (E2E): cria o cliente de pagamento da conta sem dar acesso. Fora disso, 404. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.E2E !== "1") return new Response(null, { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
  if (typeof body?.username !== "string") return new Response(null, { status: 400 });
  const db = await getDb();
  const [user] = await db.query<{ id: number; email: string; name: string }>("SELECT id, email, name FROM users WHERE username = $1", [normalizeUsername(body.username)]);
  if (!user) return new Response(null, { status: 404 });
  await ensureCustomer(db, getPaymentProvider(), user);
  return new Response(null, { status: 204 });
}
