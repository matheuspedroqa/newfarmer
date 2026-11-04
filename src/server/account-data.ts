import "server-only";
import bcrypt from "bcryptjs";
import type { Db } from "./db";
import { listUserPageViews } from "./page-views";
import { getPaymentProvider } from "./payments";
import type { PaymentProvider } from "./payments/types";
import { getSubscription } from "./subscriptions";

// Direito de acesso e portabilidade (LGPD art. 18, RGPD art. 15 e 20, CCPA): tudo que é da pessoa,
// num formato aberto. Ficam de fora senha, tokens e sessões, que só servem para entrar na conta.
export async function exportUserData(db: Db, userId: number) {
  const [account] = await db.query<{
    name: string;
    username: string;
    email: string;
    city_label: string;
    latitude: number;
    longitude: number;
    country_code: string;
    climate_zone: string;
    hemisphere: string;
    locale: string;
    theme: string;
    created_at: string;
    email_verified_at: string | null;
  }>(
    `SELECT name, username, email, city_label, latitude, longitude, country_code, climate_zone, hemisphere,
            locale, theme, created_at, email_verified_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const animals = await db.query<{ animal: string; count: number }>(
    "SELECT animal_id AS animal, count FROM farm_animals WHERE user_id = $1 ORDER BY animal_id",
    [userId],
  );
  const crops = await db.query<{ crop_id: string }>("SELECT crop_id FROM farm_crops WHERE user_id = $1 ORDER BY crop_id", [userId]);
  const diary = await db.query<{ animal: string; date: string; kind: string; animal_name: string; note: string; created_at: string }>(
    `SELECT animal_id AS animal, entry_date AS date, kind, animal_name, note, created_at
     FROM diary_entries WHERE user_id = $1 ORDER BY entry_date, id`,
    [userId],
  );
  const activity = await db.query<{ action: string; target: string; details: unknown; ip: string; created_at: string }>(
    "SELECT action, target, details, ip, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at, id",
    [userId],
  );
  const pageViews = await listUserPageViews(db, userId, 1000);
  const subscription = await getSubscription(db, userId);
  const iso = (ms: string | number | null) => (ms === null ? null : new Date(Number(ms)).toISOString());

  return {
    exportedAt: new Date().toISOString(),
    account: {
      name: account.name,
      username: account.username,
      email: account.email,
      emailConfirmedAt: iso(account.email_verified_at),
      createdAt: iso(account.created_at),
      city: account.city_label,
      latitude: account.latitude,
      longitude: account.longitude,
      country: account.country_code,
      climate: account.climate_zone,
      hemisphere: account.hemisphere,
      language: account.locale,
      theme: account.theme,
    },
    animals,
    crops: crops.map((c) => c.crop_id),
    diary: diary.map((d) => ({ ...d, created_at: iso(d.created_at) })),
    activity: activity.map((a) => ({ ...a, created_at: iso(a.created_at) })),
    subscription: subscription && {
      status: subscription.status,
      currency: subscription.currency,
      amount: subscription.amount,
      startedAt: subscription.startedAt === null ? null : iso(subscription.startedAt),
      currentPeriodEnd: subscription.currentPeriodEnd === null ? null : iso(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt === null ? null : iso(subscription.canceledAt),
    },
    pageViews: pageViews.map((v) => ({ path: v.path, referrer: v.referrer, at: iso(v.createdAt) })),
  };
}

// O banco apaga junto (ON DELETE CASCADE) criação, diário, sessões, links de e-mail e a assinatura.
// O registro de atividade fica e some no prazo da Política (180 dias), como ela explica.
// Se a pessoa tem cliente na Stripe, ele é apagado antes: a Stripe cancela na hora todas as assinaturas (inclusive uma segunda
// que o banco não conheça) e some com nome e e-mail dela. Se falhar, a conta fica (não cobrar de quem não tem mais conta).
// Vale mesmo com status local "cancelado", que pode estar velho. O provedor só é construído quando há cliente:
// apagar conta sem cliente nunca exige chaves da Stripe.
export async function deleteAccount(
  db: Db,
  userId: number,
  password: string,
  provider: PaymentProvider | (() => PaymentProvider) = getPaymentProvider,
): Promise<"ok" | "wrongPassword" | "paymentError"> {
  const [row] = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) return "wrongPassword";
  const sub = await getSubscription(db, userId);
  if (sub) {
    try {
      await (typeof provider === "function" ? provider() : provider).deleteCustomer(sub.customerId);
    } catch (error) {
      console.error("Falha ao apagar o cliente na Stripe ao apagar a conta:", error instanceof Error ? error.message : "erro");
      return "paymentError";
    }
  }
  await db.run("DELETE FROM users WHERE id = $1", [userId]);
  return "ok";
}
