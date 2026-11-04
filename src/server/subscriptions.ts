import "server-only";
import type { Db } from "./db";
import type { PaymentProvider, StripeSubscription } from "./payments/types";

export const ACCESS_STATUSES = ["active", "trialing", "past_due"] as const;

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
  };
}

export async function userIdForCustomer(db: Db, customerId: string): Promise<number | null> {
  const [r] = await db.query<{ user_id: number }>("SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1", [customerId]);
  return r ? r.user_id : null;
}

export const isAccessStatus = (status: string | undefined) => (ACCESS_STATUSES as readonly string[]).includes(status ?? "");

export function hasAccess(user: { isPlatformAdmin: boolean }, sub: Pick<SubscriptionRow, "status"> | null): boolean {
  return user.isPlatformAdmin || isAccessStatus(sub?.status);
}

/** `sub === null`: o cliente existe e ainda não há assinatura (não mexe em linha que já tem uma). */
export async function upsertSubscription(db: Db, userId: number, customerId: string, sub: StripeSubscription | null, now = Date.now()): Promise<void> {
  if (!sub) {
    await db.run(
      "INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, $2, 'none', $3) ON CONFLICT (user_id) DO NOTHING",
      [userId, customerId, now],
    );
    return;
  }
  await db.run(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, currency, amount, current_period_end, cancel_at_period_end, started_at, canceled_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $4 = ANY($11::text[]) THEN $10::bigint END, $9, $10)
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id, stripe_subscription_id = EXCLUDED.stripe_subscription_id, status = EXCLUDED.status,
       currency = EXCLUDED.currency, amount = EXCLUDED.amount, current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end, canceled_at = EXCLUDED.canceled_at, updated_at = EXCLUDED.updated_at,
       started_at = COALESCE(subscriptions.started_at, EXCLUDED.started_at)`,
    [userId, customerId, sub.id, sub.status, sub.currency, sub.amount, sub.currentPeriodEnd, sub.cancelAtPeriodEnd, sub.canceledAt, now, [...ACCESS_STATUSES]],
  );
}

/** Cria o cliente na Stripe uma vez e guarda; duas abas ao mesmo tempo acabam usando o mesmo id guardado. */
export async function ensureCustomer(db: Db, provider: PaymentProvider, user: { id: number; email: string; name: string }): Promise<string> {
  const existing = await getSubscription(db, user.id);
  if (existing) return existing.customerId;
  const created = await provider.createCustomer({ email: user.email, name: user.name, userId: user.id });
  await upsertSubscription(db, user.id, created, null);
  return (await getSubscription(db, user.id))!.customerId;
}
