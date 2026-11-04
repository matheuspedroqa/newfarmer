import { expect, it } from "vitest";
import { getAdminOverview, getSubscriberDetail, listSubscribers } from "@/server/admin";
import { saveFarm } from "@/server/farm";
import { recordPageView } from "@/server/page-views";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const DIA = 24 * 60 * 60_000;
const AGORA = 100 * DIA;

async function sub(db: Awaited<ReturnType<typeof testDb>>, userId: number, s: { status: string; currency?: string; amount?: number; startedAt?: number; canceledAt?: number }) {
  await db.run(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, status, currency, amount, started_at, canceled_at, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, `cus_${userId}`, s.status, s.currency ?? null, s.amount ?? null, s.startedAt ?? null, s.canceledAt ?? null, AGORA + DIA, AGORA],
  );
}

async function cenario() {
  const db = await testDb();
  const dono = await makeUser(db, { email: "dono@exemplo.com" });
  await db.run("UPDATE users SET is_platform_admin = TRUE WHERE id = $1", [dono]);
  const ana = await makeUser(db, { email: "ana@exemplo.com", name: "Ana" });
  const bia = await makeUser(db, { email: "bia@exemplo.com", name: "Bia", city: { label: "Lisboa, Portugal", latitude: 38.7, longitude: -9.1, countryCode: "PT" } });
  const caio = await makeUser(db, { email: "caio@exemplo.com", name: "Caio" });
  await db.run("UPDATE users SET created_at = $1", [AGORA - 30 * DIA]);
  await db.run("UPDATE users SET created_at = $2 WHERE id = $1", [bia, AGORA - 2 * DIA]);
  await sub(db, ana, { status: "active", currency: "brl", amount: 699, startedAt: AGORA - 3 * DIA });
  await sub(db, bia, { status: "canceled", currency: "eur", amount: 199, startedAt: AGORA - 60 * DIA, canceledAt: AGORA - 5 * DIA });
  await sub(db, dono, { status: "active", currency: "usd", amount: 200, startedAt: AGORA - DIA });
  return { db, dono, ana, bia, caio };
}

it("visão geral: contagens, MRR só das ativas por moeda, 30 e 7 dias, sem o dono", async () => {
  const { db, ana } = await cenario();
  await recordPageView(db, { visitorId: "v1", userId: ana, path: "/", referrer: "" }, AGORA - DIA);
  await recordPageView(db, { visitorId: "v1", userId: ana, path: "/dashboard", referrer: "" }, AGORA - DIA);
  await recordPageView(db, { visitorId: "v2", userId: null, path: "/", referrer: "" }, AGORA - 20 * DIA);
  const o = await getAdminOverview(db, AGORA);
  expect(o.users).toBe(3);
  expect(o.newUsers7d).toBe(1);
  expect(o.subscriptions).toEqual({ active: 1, past_due: 0, canceled: 1, none: 1 });
  expect(o.mrr).toEqual({ brl: 699, eur: 0, usd: 0 });
  expect(o.newSubscriptions30d).toBe(1);
  expect(o.cancellations30d).toBe(1);
  expect(o.visitors7d).toBe(1);
  expect(o.pageViews7d).toBe(2);
  expect(o.pageViewsByDay).toHaveLength(14);
  expect(o.pageViewsByDay.reduce((n, d) => n + d.views, 0)).toBe(2);
  expect(o.pageViewsByDay.at(-1)!.day).toBe(new Date(AGORA).toISOString().slice(0, 10));
});

it("lista assinantes: busca por e-mail parcial, filtro de status, paginação e totais da criação", async () => {
  const { db, ana, bia } = await cenario();
  await saveFarm(db, ana, { animals: { chickens: 3, cows: 1 }, crops: ["tomato"] });
  const todos = await listSubscribers(db, {});
  expect(todos).toHaveLength(3);
  expect(todos[0].username).toBe("bia"); // mais nova primeiro
  expect((await listSubscribers(db, { q: "IA@exe" })).map((s) => s.username)).toEqual(["bia"]);
  expect((await listSubscribers(db, { status: "active" })).map((s) => s.username)).toEqual(["ana"]);
  expect((await listSubscribers(db, { status: "none" })).map((s) => s.username)).toEqual(["caio"]);
  const a = (await listSubscribers(db, { q: "ana" }))[0];
  expect(a).toMatchObject({ animals: 4, crops: 1, status: "active", currency: "brl", country: "BR" });
  expect(a.lastSeenAt).toBeNull();
  const pg = await listSubscribers(db, { limit: 1, before: todos[0].createdAt });
  expect(pg).toHaveLength(1);
  expect(pg[0].id).not.toBe(bia);
});

it("detalhe: conta, assinatura, criação, páginas e opt-in, sem diário nem ids da Stripe", async () => {
  const { db, ana } = await cenario();
  await saveFarm(db, ana, { animals: { chickens: 3 }, crops: ["tomato"] });
  await db.run("INSERT INTO diary_entries (user_id, animal_id, entry_date, kind, note, created_at) VALUES ($1,'chickens','2026-01-01','note','segredo-da-anotacao',1)", [ana]);
  await recordPageView(db, { visitorId: "v1", userId: ana, path: "/myfarm", referrer: "" }, AGORA);
  const d = await getSubscriberDetail(db, ana);
  expect(d).toMatchObject({ username: "ana", animals: [{ id: "chickens", count: 3 }], crops: ["tomato"], marketingOptIn: false });
  expect(d!.subscription).toMatchObject({ status: "active", currency: "brl", amount: 699 });
  expect(d!.pageViews.map((p) => p.path)).toEqual(["/myfarm"]);
  const json = JSON.stringify(d);
  for (const proibido of ["segredo-da-anotacao", "password_hash", "cus_", "unsubscribe"]) expect(json).not.toContain(proibido);
  expect(await getSubscriberDetail(db, 9999)).toBeNull();
});
