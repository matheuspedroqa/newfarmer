import "server-only";
import { ANIMALS } from "@/lib/catalog";
import type { Currency } from "@/lib/pricing";
import type { Db } from "./db";
import { getFarm } from "./farm";
import { listUserPageViews } from "./page-views";
import { getSubscription } from "./subscriptions";

const DIA = 24 * 60 * 60_000;
export const SUBSCRIBER_STATUSES = ["active", "trialing", "past_due", "paused", "canceled", "none"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

// Faixa de status da assinatura; quem não tem linha (ou está em none/incomplete/unpaid) cai em "none".
// Só "active" é assinante que pagou: quem está no teste grátis ("trialing") ainda não foi cobrado e fica na própria faixa.
const BUCKET = `CASE WHEN s.status = 'active' THEN 'active' WHEN s.status = 'trialing' THEN 'trialing' WHEN s.status = 'past_due' THEN 'past_due'
  WHEN s.status = 'paused' THEN 'paused' WHEN s.status = 'canceled' THEN 'canceled' ELSE 'none' END`;

/** Tudo exclui o dono do site. */
export async function getAdminOverview(db: Db, now: number) {
  const [u] = await db.query<Record<string, string>>(
    "SELECT COUNT(*) AS users, COUNT(*) FILTER (WHERE created_at >= $1) AS new7 FROM users WHERE NOT is_platform_admin",
    [now - 7 * DIA],
  );
  const subscriptions: Record<SubscriberStatus, number> = { active: 0, trialing: 0, past_due: 0, paused: 0, canceled: 0, none: 0 };
  // sql só junta constantes deste arquivo (BUCKET) e $n: nada que venha de fora entra no texto.
  const bucketSql = `SELECT ${BUCKET} AS bucket, COUNT(*) AS n FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id WHERE NOT u.is_platform_admin GROUP BY 1`;
  for (const r of await db.query<{ bucket: SubscriberStatus; n: string }>(bucketSql)) subscriptions[r.bucket] = Number(r.n);

  const mrr: Record<Currency, number> = { brl: 0, eur: 0, usd: 0 };
  for (const r of await db.query<{ currency: Currency; total: string }>(
    `SELECT s.currency, SUM(s.amount) AS total FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE NOT u.is_platform_admin AND s.status = 'active' AND s.currency IN ('brl','eur','usd') GROUP BY s.currency`,
  )) mrr[r.currency] = Number(r.total);

  const [m] = await db.query<Record<string, string>>(
    `SELECT COUNT(*) FILTER (WHERE s.started_at >= $1 AND s.status <> 'trialing') AS started, COUNT(*) FILTER (WHERE s.canceled_at >= $1) AS canceled
     FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE NOT u.is_platform_admin`,
    [now - 30 * DIA],
  );
  const [v] = await db.query<Record<string, string>>(
    "SELECT COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM page_views WHERE created_at >= $1 AND (user_id IS NULL OR user_id NOT IN (SELECT id FROM users WHERE is_platform_admin))",
    [now - 7 * DIA],
  );
  const today = Math.floor(now / DIA);
  const perDay = new Map(
    (
      await db.query<{ day: string; n: string }>(
        "SELECT to_char(to_timestamp(created_at / 1000.0) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*) AS n FROM page_views WHERE created_at >= $1 AND (user_id IS NULL OR user_id NOT IN (SELECT id FROM users WHERE is_platform_admin)) GROUP BY 1",
        [(today - 13) * DIA],
      )
    ).map((r) => [r.day, Number(r.n)]),
  );
  const pageViewsByDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date((today - 13 + i) * DIA).toISOString().slice(0, 10);
    return { day, views: perDay.get(day) ?? 0 };
  });

  return {
    users: Number(u.users), newUsers7d: Number(u.new7), subscriptions, mrr,
    newSubscriptions30d: Number(m.started), cancellations30d: Number(m.canceled),
    visitors7d: Number(v.visitors), pageViews7d: Number(v.views), pageViewsByDay,
  };
}

// shortcut: o cursor `before` é só o createdAt; contas criadas no mesmo milissegundo podem pular uma página.
export async function listSubscribers(db: Db, opts: { q?: string; status?: SubscriberStatus; before?: number; limit?: number }) {
  const params: unknown[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;
  const where = ["NOT u.is_platform_admin"];
  const q = opts.q?.trim();
  if (q) {
    const like = p(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    where.push(`(u.name ILIKE ${like} OR u.email ILIKE ${like} OR u.username ILIKE ${like})`);
  }
  // Sem filtro, só quem tem ou já teve assinatura confirmada na Stripe; conta que só chegou ao pagamento aparece em "Sem assinatura".
  where.push(opts.status ? `${BUCKET} = ${p(opts.status)}` : `${BUCKET} <> 'none'`);
  if (opts.before) where.push(`u.created_at < ${p(opts.before)}`);
  const limit = p(opts.limit ?? 50);
  const sql = `SELECT u.id, u.name, u.username, u.email, u.city_label, u.country_code, u.created_at, ${BUCKET} AS bucket, s.currency, s.current_period_end,
       (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = u.id) AS last_seen_at,
       (SELECT COALESCE(SUM(count), 0) FROM farm_animals WHERE user_id = u.id) AS animals,
       (SELECT COUNT(*) FROM farm_crops WHERE user_id = u.id) AS crops
     FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE ${where.join(" AND ")} ORDER BY u.created_at DESC, u.id DESC LIMIT ${limit}`;
  const rows = await db.query<Record<string, unknown>>(sql, params);
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), username: String(r.username), email: String(r.email),
    city: String(r.city_label), country: String(r.country_code), status: r.bucket as SubscriberStatus,
    currency: (r.currency as string | null) ?? null, currentPeriodEnd: num(r.current_period_end),
    createdAt: Number(r.created_at), lastSeenAt: num(r.last_seen_at), animals: Number(r.animals), crops: Number(r.crops),
  }));
}

/** Sem diário, token de descadastro nem ids da Stripe: o dono vê quem é e o que criou, não o que escreveu. */
export async function getSubscriberDetail(db: Db, userId: number) {
  const [u] = await db.query<Record<string, unknown>>(
    `SELECT id, name, username, email, city_label, country_code, created_at, email_verified_at, marketing_opt_in,
       (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = users.id) AS last_seen_at
     FROM users WHERE id = $1 AND NOT is_platform_admin`,
    [userId],
  );
  if (!u) return null;
  const sub = await getSubscription(db, userId);
  const subscription = sub && {
    status: sub.status, currency: sub.currency, amount: sub.amount, currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd, startedAt: sub.startedAt, canceledAt: sub.canceledAt,
    cancelReason: sub.cancelReason, cancelDetails: sub.cancelDetails,
  };
  const farm = await getFarm(db, userId);
  return {
    id: Number(u.id), name: String(u.name), username: String(u.username), email: String(u.email),
    city: String(u.city_label), country: String(u.country_code),
    createdAt: Number(u.created_at), emailVerified: u.email_verified_at !== null,
    lastSeenAt: u.last_seen_at === null ? null : Number(u.last_seen_at),
    marketingOptIn: u.marketing_opt_in === true,
    subscription, animals: farm.animals, crops: farm.crops as string[],
    pageViews: await listUserPageViews(db, userId, 200, { latest: true }),
  };
}

export const animalIcon = (id: string) => ANIMALS.find((a) => a.id === id)?.icon ?? "🐾";
