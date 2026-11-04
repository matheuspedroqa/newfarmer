import { normalizeUsername } from "@/lib/username";
import { getDb } from "@/server/db";

const STATUSES = ["active", "canceled", "past_due", "none"];

/** Só para os robôs (E2E): define a situação da assinatura de uma conta (o pagamento falso não cancela). Fora disso, 404. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.E2E !== "1") return new Response(null, { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const body = (await request.json().catch(() => null)) as { username?: unknown; status?: unknown } | null;
  if (typeof body?.username !== "string" || typeof body.status !== "string" || !STATUSES.includes(body.status)) return new Response(null, { status: 400 });
  const changed = await (await getDb()).run(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at)
     SELECT id, 'cus_dev_' || id, $2::text, $3::bigint FROM users WHERE username = $1
     ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
    [normalizeUsername(body.username), body.status, Date.now()],
  );
  return new Response(null, { status: changed ? 204 : 404 });
}
