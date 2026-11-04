import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleStripeWebhook, verifyStripeSignature } from "@/server/stripe-webhook";
import { getSubscription, upsertSubscription } from "@/server/subscriptions";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const SECRET = "whsec_test";
const sign = (body: string, t = Math.floor(Date.now() / 1000), secret = SECRET) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
const event = (id: string, type: string, status = "active", created = 1000, subId = "sub_1") =>
  JSON.stringify({ id, type, created, data: { object: { id: subId, customer: "cus_1", status, cancel_at_period_end: false, canceled_at: null, items: { data: [{ current_period_end: 2000, price: { unit_amount: 699, currency: "brl" } }] } } } });
const req = (body: string, sig: string | null) =>
  new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: sig ? { "stripe-signature": sig } : {} });

afterEach(() => vi.unstubAllEnvs());

describe("verifyStripeSignature", () => {
  const now = 1_000_000;
  const body = '{"a":1}';
  it("aceita a certa, inclusive com vários v1", () => {
    expect(verifyStripeSignature(body, sign(body, now), SECRET, now)).toBe(true);
    expect(verifyStripeSignature(body, `${sign(body, now)},v1=abcd`, SECRET, now)).toBe(true);
    expect(verifyStripeSignature(body, `t=${now},v1=abcd,${sign(body, now).split(",")[1]}`, SECRET, now)).toBe(true);
  });
  it("recusa corpo alterado, segredo errado, hora velha, cabeçalho vazio ou lixo", () => {
    expect(verifyStripeSignature(body + " ", sign(body, now), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now, "outro"), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now - 301), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now + 301), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, "", SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now},v1=zz`, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, `v1=${sign(body, now).split("v1=")[1]}`, SECRET, now)).toBe(false);
  });
});

describe("webhook", () => {
  it("sem segredo configurado: 500 sem abrir o banco", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const getDb = vi.fn();
    expect((await handleStripeWebhook(req("{}", sign("{}")), getDb)).status).toBe(500);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("assinatura inválida: 401, não abre o banco", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const getDb = vi.fn();
    expect((await handleStripeWebhook(req(event("e1", "customer.subscription.updated"), "t=1,v1=00"), getDb)).status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("updated grava; o mesmo evento duas vezes grava uma; deleted cancela", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", null);
    const body = event("e1", "customer.subscription.updated");
    expect((await handleStripeWebhook(req(body, sign(body)), db)).status).toBe(200);
    expect(await getSubscription(db, ana)).toMatchObject({ status: "active", currency: "brl", amount: 699, currentPeriodEnd: 2_000_000 });
    await db.run("UPDATE subscriptions SET status = 'x'");
    expect((await handleStripeWebhook(req(body, sign(body)), db)).status).toBe(200);
    expect((await getSubscription(db, ana))?.status).toBe("x");
    expect(await db.query("SELECT 1 FROM stripe_events")).toHaveLength(1);

    const del = event("e2", "customer.subscription.deleted", "canceled");
    await handleStripeWebhook(req(del, sign(del)), db);
    const s = await getSubscription(db, ana);
    expect(s?.status).toBe("canceled");
    expect(s?.canceledAt).toBeGreaterThan(0);
  });

  it("cliente desconhecido e tipo desconhecido: 200 sem gravar assinatura", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const db = await testDb();
    const a = event("e1", "customer.subscription.created");
    const b = event("e2", "invoice.paid");
    expect((await handleStripeWebhook(req(a, sign(a)), db)).status).toBe(200);
    expect((await handleStripeWebhook(req(b, sign(b)), db)).status).toBe(200);
    expect(await db.query("SELECT 1 FROM subscriptions")).toHaveLength(0);
  });

  it("evento velho reenviado depois do cancelamento não reativa; outra assinatura cancelada não derruba a ativa", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", null);
    const send = async (b: string) => handleStripeWebhook(req(b, sign(b)), db);
    await send(event("e1", "customer.subscription.created", "active", 100));
    await send(event("e2", "customer.subscription.deleted", "canceled", 300));
    await send(event("e3", "customer.subscription.updated", "active", 200));
    expect((await getSubscription(db, ana))?.status).toBe("canceled");

    await send(event("e4", "customer.subscription.updated", "active", 400, "sub_2"));
    await send(event("e5", "customer.subscription.deleted", "canceled", 500, "sub_1"));
    expect(await getSubscription(db, ana)).toMatchObject({ status: "active", subscriptionId: "sub_2" });
  });

  it("corpo grande demais: 413 antes de olhar a assinatura", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const getDb = vi.fn();
    const big = "x".repeat(1_048_577);
    expect((await handleStripeWebhook(req(big, sign(big)), getDb)).status).toBe(413);
    const r = new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}", headers: { "content-length": "2000000" } });
    expect((await handleStripeWebhook(r, getDb)).status).toBe(413);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("corpo que não é JSON com assinatura certa: 400", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const db = await testDb();
    expect((await handleStripeWebhook(req("não é json", sign("não é json")), db)).status).toBe(400);
  });
});
