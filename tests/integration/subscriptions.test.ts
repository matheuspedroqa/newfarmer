import { describe, expect, it, vi } from "vitest";
import { shouldUseFakePayments } from "@/server/payments";
import { createFakePaymentProvider } from "@/server/payments/fake";
import { ensureCustomer, getSubscription, hasAccess, upsertSubscription, userIdForCustomer } from "@/server/subscriptions";
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
