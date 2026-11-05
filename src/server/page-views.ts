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

// Um lead é uma conta (sempre aparece, aceitando ou não os cookies de estatística) ou um visitante sem conta (só com estatística).
// Passo: 0 landing, 1 cadastro, 2 escolheu a criação, 3 abriu o pagamento, 4 assinou. Conta vem dos dados dela, não só das visitas.
// shortcut: lê todas as visitas a cada abertura da aba; com dezenas de milhares de visitas, guardar o passo numa tabela.
const LEADS = `WITH pv AS (
    SELECT visitor_id::text AS visitor_id, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen, COUNT(*) AS pages,
      (array_agg(path ORDER BY created_at DESC, id DESC))[1] AS last_path, MAX(user_id) AS uid,
      MAX(CASE WHEN path IN ('/', '/pt') THEN 0 WHEN path = '/register' THEN 1 WHEN path = '/welcome' THEN 2
               WHEN path = '/subscribe' OR path LIKE '/subscribe/%' THEN 3 ELSE -1 END) AS step
    FROM page_views WHERE ${NOT_ADMIN} GROUP BY visitor_id
  ),
  acc AS (
    SELECT u.id AS uid, u.username, u.email, u.created_at, MIN(pv.first_seen) AS first_seen, MAX(pv.last_seen) AS last_seen,
      COALESCE(SUM(pv.pages), 0) AS pages, (array_agg(pv.last_path ORDER BY pv.last_seen DESC NULLS LAST))[1] AS last_path, MAX(pv.step) AS pv_step
    FROM users u LEFT JOIN pv ON pv.uid = u.id
    WHERE NOT u.is_platform_admin GROUP BY u.id, u.username, u.email, u.created_at
  ),
  leads AS (
    SELECT 'v:' || visitor_id AS id, first_seen, last_seen, pages, last_path, NULL::integer AS uid, NULL::text AS username, NULL::text AS email, step
    FROM pv WHERE uid IS NULL
    UNION ALL
    SELECT 'u:' || a.uid, LEAST(a.created_at, COALESCE(a.first_seen, a.created_at)), GREATEST(a.created_at, COALESCE(a.last_seen, 0)),
      a.pages, a.last_path, a.uid, a.username, a.email,
      CASE WHEN s.status IN ('active','trialing','past_due') THEN 4
           WHEN s.user_id IS NOT NULL THEN 3
           WHEN EXISTS (SELECT 1 FROM farm_animals f WHERE f.user_id = a.uid) OR EXISTS (SELECT 1 FROM farm_crops c WHERE c.user_id = a.uid) THEN GREATEST(2, COALESCE(a.pv_step, 2))
           ELSE GREATEST(1, COALESCE(a.pv_step, 1)) END
    FROM acc a LEFT JOIN subscriptions s ON s.user_id = a.uid
  )`;

/** Quantos leads chegaram pelo menos até cada passo desde `sinceMs` (nunca passa de 100% do passo anterior). */
export async function leadFunnel(db: Db, sinceMs: number) {
  const [r] = await db.query<Record<string, string>>(
    `${LEADS} SELECT COUNT(*) FILTER (WHERE step >= 0) AS home, COUNT(*) FILTER (WHERE step >= 1) AS reg, COUNT(*) FILTER (WHERE step >= 2) AS welcome,
       COUNT(*) FILTER (WHERE step >= 3) AS sub, COUNT(*) FILTER (WHERE step >= 4) AS paid FROM leads WHERE last_seen >= $1`,
    [sinceMs],
  );
  return { "/": Number(r.home), "/register": Number(r.reg), "/welcome": Number(r.welcome), "/subscribe": Number(r.sub), paid: Number(r.paid) };
}

export interface Lead {
  id: string;
  firstSeen: number;
  lastSeen: number;
  /** Páginas vistas com estatística ligada (0: a pessoa não aceitou os cookies de estatística). */
  pages: number;
  lastPath: string | null;
  furthestStep: (typeof FUNNEL_STEPS)[number] | null;
  user: { id: number; username: string; email: string } | null;
  subscribed: boolean;
}

// shortcut: `before` é só o lastSeen; leads com a mesma última visita no mesmo milissegundo podem pular uma página.
export async function listLeads(db: Db, { since, before, limit = 50 }: { since: number; before?: number; limit?: number }): Promise<Lead[]> {
  const params: unknown[] = [since];
  const older = before ? `AND last_seen < $${params.push(before)}` : "";
  const lim = `$${params.push(limit)}`;
  // sql só junta constantes deste arquivo e $n: nada que venha de fora entra no texto.
  const rows = await db.query<Record<string, string | number | null>>(
    `${LEADS} SELECT * FROM leads WHERE last_seen >= $1 ${older} ORDER BY last_seen DESC, id LIMIT ${lim}`,
    params,
  );
  return rows.map((r) => ({
    id: String(r.id),
    firstSeen: Number(r.first_seen),
    lastSeen: Number(r.last_seen),
    pages: Number(r.pages),
    lastPath: r.last_path === null ? null : String(r.last_path),
    furthestStep: FUNNEL_STEPS[Number(r.step)] ?? null,
    user: r.uid === null ? null : { id: Number(r.uid), username: String(r.username), email: String(r.email) },
    subscribed: Number(r.step) === 4,
  }));
}
