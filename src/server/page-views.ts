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
export async function listUserPageViews(db: Db, userId: number, limit: number | null = 200, opts: { latest?: boolean } = {}) {
  const rows = await db.query<{ path: string; referrer: string; created_at: string }>(
    opts.latest
      ? "SELECT path, referrer, created_at FROM page_views WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2"
      : "SELECT path, referrer, created_at FROM page_views WHERE user_id = $1 ORDER BY created_at, id LIMIT $2",
    [userId, limit],
  );
  return rows.map((r) => ({ path: r.path, referrer: r.referrer, createdAt: Number(r.created_at) }));
}

// Texto fixo do código. Tira os visitantes que alguma vez entraram como dono do site.
const NOT_ADMIN = "visitor_id NOT IN (SELECT visitor_id FROM page_views WHERE user_id IN (SELECT id FROM users WHERE is_platform_admin))";

/** Visitantes distintos que chegaram a cada passo desde `sinceMs`. */
export async function leadFunnel(db: Db, sinceMs: number) {
  const [r] = await db.query<Record<string, string>>(
    `SELECT
       COUNT(DISTINCT visitor_id) FILTER (WHERE path IN ('/', '/pt')) AS home,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/register') AS reg,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/welcome') AS welcome,
       COUNT(DISTINCT visitor_id) FILTER (WHERE path = '/subscribe' OR path LIKE '/subscribe/%') AS sub,
       COUNT(DISTINCT visitor_id) FILTER (WHERE user_id IN (SELECT user_id FROM subscriptions WHERE status IN ('active','trialing','past_due'))) AS paid
     FROM page_views WHERE created_at >= $1 AND ${NOT_ADMIN}`,
    [sinceMs],
  );
  return { "/": Number(r.home), "/register": Number(r.reg), "/welcome": Number(r.welcome), "/subscribe": Number(r.sub), paid: Number(r.paid) };
}

export interface Lead {
  visitorId: string;
  firstSeen: number;
  lastSeen: number;
  pages: number;
  lastPath: string;
  furthestStep: (typeof FUNNEL_STEPS)[number] | null;
  user: { id: number; username: string; email: string } | null;
  subscribed: boolean;
}

// shortcut: `before` é só o lastSeen; visitantes com a mesma última visita no mesmo milissegundo podem pular uma página.
export async function listLeads(db: Db, { since, before, limit = 50 }: { since: number; before?: number; limit?: number }): Promise<Lead[]> {
  const params: unknown[] = [since];
  const having = before ? `HAVING MAX(created_at) < $${params.push(before)}` : "";
  const lim = `$${params.push(limit)}`;
  // sql só junta constantes deste arquivo e $n: nada que venha de fora entra no texto.
  const sql = `WITH v AS (
       SELECT visitor_id, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen, COUNT(*) AS pages,
         (array_agg(path ORDER BY created_at DESC, id DESC))[1] AS last_path, MAX(user_id) AS uid,
         MAX(CASE WHEN path IN ('/', '/pt') THEN 0 WHEN path = '/register' THEN 1 WHEN path = '/welcome' THEN 2
                  WHEN path = '/subscribe' OR path LIKE '/subscribe/%' THEN 3 ELSE -1 END) AS step
       FROM page_views WHERE created_at >= $1 AND ${NOT_ADMIN} GROUP BY visitor_id ${having}
     )
     SELECT v.*, u.username, u.email, COALESCE(s.status IN ('active','trialing','past_due'), FALSE) AS subscribed
     FROM v LEFT JOIN users u ON u.id = v.uid LEFT JOIN subscriptions s ON s.user_id = v.uid
     ORDER BY v.last_seen DESC, v.visitor_id LIMIT ${lim}`;
  const rows = await db.query<Record<string, string | number | boolean | null>>(sql, params);
  return rows.map((r) => {
    const subscribed = Boolean(r.subscribed);
    return {
      visitorId: String(r.visitor_id),
      firstSeen: Number(r.first_seen),
      lastSeen: Number(r.last_seen),
      pages: Number(r.pages),
      lastPath: String(r.last_path),
      furthestStep: subscribed ? "paid" : FUNNEL_STEPS[Number(r.step)] ?? null,
      user: r.uid === null ? null : { id: Number(r.uid), username: String(r.username), email: String(r.email) },
      subscribed,
    };
  });
}
