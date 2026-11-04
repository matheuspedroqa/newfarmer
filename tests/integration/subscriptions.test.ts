import { describe, expect, it, vi } from "vitest";
import { shouldUseFakePayments } from "@/server/payments";
import { createFakePaymentProvider } from "@/server/payments/fake";
import { ensureCustomer, getSubscription, hasAccess, hasOpenSubscription, upsertSubscription, userIdForCustomer } from "@/server/subscriptions";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const sub = (over = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", currency: "brl", amount: 699, currentPeriodEnd: 9_000, cancelAtPeriodEnd: false, canceledAt: null, ...over });

describe("assinaturas", () => {
  it("hasAccess", () => {
    const row = (status: string) => ({ status }) as Parameters<typeof hasAccess>[1];
    expect(hasAccess({ isPlatformAdmin: true }, null)).toBe(true);
    for (const s of ["active", "trialing", "past_due"]) expect(hasAccess({ isPlatformAdmin: false }, row(s)), s).toBe(true);
    for (const s of ["canceled", "incomplete", "none"]) expect(hasAccess({ isPlatformAdmin: false }, row(s)), s).toBe(false);
    expect(hasAccess({ isPlatformAdmin: false }, null)).toBe(false);
  });

  it("ensureCustomer cria uma vez só", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const provider = createFakePaymentProvider();
    const spy = vi.spyOn(provider, "createCustomer");
    const user = { id: ana, email: "ana@exemplo.com", name: "Ana" };
    const a = await ensureCustomer(db, provider, user);
    expect(await ensureCustomer(db, provider, user)).toBe(a);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((await getSubscription(db, ana))?.status).toBe("none");
    expect(await userIdForCustomer(db, a)).toBe(ana);
    expect(await userIdForCustomer(db, "cus_x")).toBeNull();
  });

  it("upsert grava, mantém started_at e não apaga assinatura com null", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", null);
    expect((await getSubscription(db, ana))?.startedAt).toBeNull();
    await upsertSubscription(db, ana, "cus_1", sub(), 100);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "past_due" }), 200);
    await upsertSubscription(db, ana, "cus_1", null, 300);
    const s = await getSubscription(db, ana);
    expect(s).toMatchObject({ status: "past_due", currency: "brl", amount: 699, currentPeriodEnd: 9000, startedAt: 100, customerId: "cus_1", subscriptionId: "sub_1" });
  });

  it("fake só fora de produção", () => {
    expect(shouldUseFakePayments({ STRIPE_FAKE: "1", NODE_ENV: "test" })).toBe(true);
    expect(shouldUseFakePayments({ STRIPE_FAKE: "1", NODE_ENV: "production" })).toBe(false);
    expect(shouldUseFakePayments({ NODE_ENV: "test" })).toBe(false);
  });
});

describe("ordem e várias assinaturas", () => {
  it("evento velho não tira a assinatura do estado terminal", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "canceled" }), 100, 50);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "active" }), 200, 40);
    expect((await getSubscription(db, ana))?.status).toBe("canceled");
    await upsertSubscription(db, ana, "cus_1", sub({ status: "active" }), 300);
    expect((await getSubscription(db, ana))?.status).toBe("canceled");
  });

  it("evento mais velho depois de um mais novo é ignorado; igual ou mais novo vale", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "active" }), 100, 50);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "past_due" }), 200, 40);
    expect((await getSubscription(db, ana))?.status).toBe("active");
    await upsertSubscription(db, ana, "cus_1", sub({ status: "past_due" }), 300, 60);
    expect((await getSubscription(db, ana))?.status).toBe("past_due");
  });

  it("cancelamento de outra assinatura não derruba a que está ativa", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", sub({ id: "sub_A" }), 100, 10);
    await upsertSubscription(db, ana, "cus_1", sub({ id: "sub_B", status: "canceled" }), 200, 20);
    expect(await getSubscription(db, ana)).toMatchObject({ status: "active", subscriptionId: "sub_A" });
    await upsertSubscription(db, ana, "cus_1", sub({ id: "sub_C", status: "active" }), 300, 30);
    expect((await getSubscription(db, ana))?.subscriptionId).toBe("sub_C");
  });

  it("upsert sem eventCreated (retorno do checkout) não apaga a marca de ordem", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "active" }), 100, 200);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "trialing" }), 150);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "past_due" }), 160, 100);
    expect((await getSubscription(db, ana))?.status).toBe("trialing");
  });

  it("depois de cancelada, uma assinatura nova assume a linha", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await upsertSubscription(db, ana, "cus_1", sub({ id: "sub_A", status: "canceled" }), 100, 10);
    await upsertSubscription(db, ana, "cus_1", sub({ id: "sub_B" }), 200, 20);
    expect(await getSubscription(db, ana)).toMatchObject({ status: "active", subscriptionId: "sub_B" });
  });

  it("hasOpenSubscription", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    expect(await hasOpenSubscription(db, ana)).toBe(false);
    await upsertSubscription(db, ana, "cus_1", null);
    expect(await hasOpenSubscription(db, ana)).toBe(false);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "trialing" }));
    expect(await hasOpenSubscription(db, ana)).toBe(true);
    await upsertSubscription(db, ana, "cus_1", sub({ status: "canceled" }));
    expect(await hasOpenSubscription(db, ana)).toBe(false);
  });
});

describe("limpeza", () => {
  it("purgeOld apaga stripe_events com mais de 30 dias", async () => {
    const { purgeOld } = await import("@/server/activity-log");
    const db = await testDb();
    const day = 86_400_000;
    await db.run("INSERT INTO stripe_events (id, received_at) VALUES ('old', $1), ('new', $2)", [1, 100 * day]);
    await purgeOld(db, 100 * day + 1);
    expect((await db.query<{ id: string }>("SELECT id FROM stripe_events")).map((r) => r.id)).toEqual(["new"]);
  });
});
