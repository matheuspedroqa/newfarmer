import "server-only";
import type { Db } from "./db";

export const FUNNEL_STEPS = ["/", "/register", "/welcome", "/subscribe", "paid"] as const;

export async function recordPageView(
  db: Db,
  v: { visitorId: string; userId: number | null; path: string; referrer: string },
  now = Date.now(),
) {
  await db.run("INSERT INTO page_views (visitor_id, user_id, path, referrer, created_at) VALUES ($1,$2,$3,$4,$5)", [
    v.visitorId, v.userId, v.path, v.referrer, now,
  ]);
}

export const linkVisitorToUser = (db: Db, visitorId: string, userId: number) =>
  db.run("UPDATE page_views SET user_id = $2 WHERE visitor_id = $1 AND user_id IS NULL", [visitorId, userId]);

/** Padrão: as `limit` mais antigas, em ordem. `latest`: as `limit` mais recentes, da mais nova para a mais velha. */
export async function listUserPageViews(db: Db, userId: number, limit = 200, opts: { latest?: boolean } = {}) {
  const rows = await db.query<{ path: string; referrer: string; created_at: string }>(
    opts.latest
      ? "SELECT path, referrer, created_at FROM page_views WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2"
      : "SELECT path, referrer, created_at FROM page_views WHERE user_id = $1 ORDER BY created_at, id LIMIT $2",
    [userId, limit],
  );
  return rows.map((r) => ({ path: r.path, referrer: r.referrer, createdAt: Number(r.created_at) }));
}

/** Visitantes distintos que chegaram a cada passo desde `sinceMs`. */
export async function leadFunnel(db: Db, sinceMs: number) {
  const [r] = await db.query<Record<string, string>>(
    `SELECT
       COUNT(DISTINCT visitor_id) FILTER (WHERE path IN ('/', '/pt')) AS home,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/register') AS reg,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/welcome') AS welcome,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/subscribe' OR path LIKE '/subscribe/%') AS sub,
       COUNT(DISTINCT visitor_id) FILTER (WHERE user_id IN (SELECT user_id FROM subscriptions WHERE status IN ('active','trialing','past_due'))) AS paid
     FROM page_views WHERE created_at >= $1`,
    [sinceMs],
  );
  return { "/": Number(r.home), "/register": Number(r.reg), "/welcome": Number(r.welcome), "/subscribe": Number(r.sub), paid: Number(r.paid) };
}
