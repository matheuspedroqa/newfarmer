import "server-only";
import type { Db } from "./db";
import type { PaymentProvider, StripeSubscription } from "./payments/types";

export const ACCESS_STATUSES = ["active", "trialing", "past_due"] as const;
export const TRIAL_DAYS = 3;

/** Teste grátis: só para quem nunca teve assinatura nesta conta e cujo e-mail nunca começou um teste (nem em conta já apagada). */
export async function trialEligible(db: Db, userId: number): Promise<boolean> {
  const [r] = await db.query<{ ok: boolean }>(
    `SELECT NOT EXISTS (SELECT 1 FROM trial_emails t WHERE t.email_hash = encode(sha256(convert_to(lower(u.email), 'UTF8')), 'hex'))
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.stripe_subscription_id IS NOT NULL) AS ok
     FROM users u WHERE u.id = $1`,
    [userId],
  );
  return r?.ok === true;
}

export type SubscriptionRow = {
  userId: number;
  customerId: string;
  subscriptionId: string | null;
  status: string;
  currency: string | null;
  amount: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  startedAt: number | null;
  canceledAt: number | null;
  cancelReason: string | null;
  cancelDetails: string | null;
  cancelRequestedAt: number | null;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getSubscription(db: Db, userId: number): Promise<SubscriptionRow | null> {
  const [r] = await db.query<Record<string, unknown>>("SELECT * FROM subscriptions WHERE user_id = $1", [userId]);
  if (!r) return null;
  return {
    userId: Number(r.user_id),
    customerId: String(r.stripe_customer_id),
    subscriptionId: (r.stripe_subscription_id as string | null) ?? null,
    status: String(r.status),
    currency: (r.currency as string | null) ?? null,
    amount: num(r.amount),
    currentPeriodEnd: num(r.current_period_end),
    cancelAtPeriodEnd: r.cancel_at_period_end === true,
    startedAt: num(r.started_at),
    canceledAt: num(r.canceled_at),
    cancelReason: (r.cancel_reason as string | null) ?? null,
    cancelDetails: (r.cancel_details as string | null) ?? null,
    cancelRequestedAt: num(r.cancel_requested_at),
  };
}

export async function userIdForCustomer(db: Db, customerId: string): Promise<number | null> {
  const [r] = await db.query<{ user_id: number }>("SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1", [customerId]);
  return r ? r.user_id : null;
}

export const isAccessStatus = (status: string | undefined) => (ACCESS_STATUSES as readonly string[]).includes(status ?? "");

/** Assinatura que ainda vai renovar: precisa ser cancelada antes de apagar a conta. */
export const mustCancelFirst = (sub: Pick<SubscriptionRow, "status" | "cancelAtPeriodEnd"> | null) => !!sub && isAccessStatus(sub.status) && !sub.cancelAtPeriodEnd;

export function hasAccess(user: { isPlatformAdmin: boolean }, sub: Pick<SubscriptionRow, "status"> | null): boolean {
  return user.isPlatformAdmin || isAccessStatus(sub?.status);
}

/** `sub === null`: o cliente existe e ainda não há assinatura (não mexe em linha que já tem uma). */
export async function hasOpenSubscription(db: Db, userId: number): Promise<boolean> {
  return isAccessStatus((await getSubscription(db, userId))?.status);
}

/**
 * Guardas contra evento fora de ordem (a Stripe reenvia e não garante a ordem), todos no UPDATE:
 * - assinatura que já terminou (canceled/incomplete_expired) nunca volta;
 * - evento mais velho (event.created) que o último aplicado à mesma assinatura é ignorado;
 * - assinatura diferente da que dá acesso, sem dar acesso ela mesma, não derruba a ativa.
 * `eventCreated` em segundos, como a Stripe manda; sem ele (retorno do checkout) só valem a 1ª e a 3ª regra.
 */
export async function upsertSubscription(db: Db, userId: number, customerId: string, sub: StripeSubscription | null, now = Date.now(), eventCreated: number | null = null): Promise<void> {
  if (!sub) {
    await db.run(
      "INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, $2, 'none', $3) ON CONFLICT (user_id) DO NOTHING",
      [userId, customerId, now],
    );
    return;
  }
  if (sub.status === "trialing")
    await db.run("INSERT INTO trial_emails (email_hash, used_at) SELECT encode(sha256(convert_to(lower(u.email), 'UTF8')), 'hex'), $2 FROM users u WHERE u.id = $1 ON CONFLICT DO NOTHING", [userId, now]);
  await db.run(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, currency, amount, current_period_end, cancel_at_period_end, started_at, canceled_at, updated_at, stripe_event_created)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $4 = ANY($11::text[]) THEN $10::bigint END, $9, $10, $12::bigint)
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id, stripe_subscription_id = EXCLUDED.stripe_subscription_id, status = EXCLUDED.status,
       currency = EXCLUDED.currency, amount = EXCLUDED.amount, current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end, canceled_at = EXCLUDED.canceled_at, updated_at = EXCLUDED.updated_at,
       started_at = COALESCE(subscriptions.started_at, EXCLUDED.started_at), stripe_event_created = COALESCE(EXCLUDED.stripe_event_created, subscriptions.stripe_event_created)
     WHERE NOT (
       subscriptions.stripe_subscription_id IS NOT DISTINCT FROM EXCLUDED.stripe_subscription_id
       AND (subscriptions.status IN ('canceled', 'incomplete_expired')
            OR COALESCE(subscriptions.stripe_event_created > EXCLUDED.stripe_event_created, FALSE))
     ) AND NOT (
       subscriptions.stripe_subscription_id IS DISTINCT FROM EXCLUDED.stripe_subscription_id
       AND subscriptions.status = ANY($11::text[]) AND NOT (EXCLUDED.status = ANY($11::text[]))
     )`,
    [userId, customerId, sub.id, sub.status, sub.currency, sub.amount, sub.currentPeriodEnd, sub.cancelAtPeriodEnd, sub.canceledAt, now, [...ACCESS_STATUSES], eventCreated],
  );
}

/** Pedido de cancelamento pelo Perfil: só para assinatura que dá acesso e ainda não está para terminar. Guarda o motivo. */
export async function requestCancellation(
  db: Db,
  provider: PaymentProvider,
  userId: number,
  input: { reason: string; details: string },
  now = Date.now(),
): Promise<"ok" | "notCancelable"> {
  const sub = await getSubscription(db, userId);
  if (!sub?.subscriptionId || !isAccessStatus(sub.status) || sub.cancelAtPeriodEnd) return "notCancelable";
  await upsertSubscription(db, userId, sub.customerId, await provider.cancelAtPeriodEnd(sub.subscriptionId), now);
  await db.run(
    "UPDATE subscriptions SET cancel_reason = $2, cancel_details = $3, cancel_requested_at = $4 WHERE user_id = $1",
    [userId, input.reason, input.details || null, now],
  );
  return "ok";
}

/** Cria o cliente na Stripe uma vez e guarda; duas abas ao mesmo tempo acabam usando o mesmo id guardado. */
export async function ensureCustomer(db: Db, provider: PaymentProvider, user: { id: number; email: string; name: string }): Promise<string> {
  const existing = await getSubscription(db, user.id);
  if (existing) return existing.customerId;
  const created = await provider.createCustomer({ email: user.email, name: user.name, userId: user.id });
  await upsertSubscription(db, user.id, created, null);
  return (await getSubscription(db, user.id))!.customerId;
}
