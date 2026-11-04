import { describe, expect, it } from "vitest";
import { purgeOld } from "@/server/activity-log";
import { exportUserData } from "@/server/account-data";
import { leadFunnel, linkVisitorToUser, listUserPageViews, recordPageView } from "@/server/page-views";
import { upsertSubscription } from "@/server/subscriptions";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const view = (visitorId: string, path: string, userId: number | null = null) => ({ visitorId, userId, path, referrer: "" });
const DAY = 86_400_000;

describe("page views", () => {
  it("grava e lista as visitas de uma conta da mais antiga para a mais nova", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    await recordPageView(db, { ...view("v1", "/b", ana), referrer: "google.com" }, 2000);
    await recordPageView(db, view("v1", "/a", ana), 1000);
    await recordPageView(db, view("v2", "/x"), 1500);
    expect(await listUserPageViews(db, ana)).toEqual([
      { path: "/a", referrer: "", createdAt: 1000 },
      { path: "/b", referrer: "google.com", createdAt: 2000 },
    ]);
    expect((await exportUserData(db, ana)).pageViews).toHaveLength(2);
  });

  it("linkVisitorToUser liga só as visitas sem dono daquele visitante", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    await recordPageView(db, view("v1", "/"), 1);
    await recordPageView(db, view("v1", "/old", bia), 2);
    await recordPageView(db, view("v2", "/"), 3);
    await linkVisitorToUser(db, "v1", ana);
    expect((await listUserPageViews(db, ana)).map((v) => v.path)).toEqual(["/"]);
    expect((await listUserPageViews(db, bia)).map((v) => v.path)).toEqual(["/old"]);
    expect(await db.query("SELECT 1 FROM page_views WHERE user_id IS NULL")).toHaveLength(1);
  });

  it("purgeOld apaga visitas com mais de 180 dias e mantém as recentes", async () => {
    const db = await testDb();
    const now = 400 * DAY;
    await recordPageView(db, view("v1", "/old"), now - 181 * DAY);
    await recordPageView(db, view("v1", "/new"), now - 179 * DAY);
    await purgeOld(db, now);
    expect((await db.query<{ path: string }>("SELECT path FROM page_views")).map((r) => r.path)).toEqual(["/new"]);
  });

  it("leadFunnel conta visitantes distintos por passo", async () => {
    const db = await testDb();
    await recordPageView(db, view("a", "/"), 10);
    await recordPageView(db, view("a", "/"), 11);
    await recordPageView(db, view("b", "/pt"), 10);
    await recordPageView(db, view("b", "/register"), 11);
    await recordPageView(db, view("c", "/"), 10);
    await recordPageView(db, view("c", "/register"), 11);
    await recordPageView(db, view("c", "/welcome"), 12);
    await recordPageView(db, view("c", "/subscribe/ok"), 13);
    await recordPageView(db, view("old", "/"), 1);
    expect(await leadFunnel(db, 5)).toEqual({ "/": 3, "/register": 2, "/welcome": 1, "/subscribe": 1, paid: 0 });
  });

  it("paid conta visitantes distintos de contas com assinatura que libera acesso", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    const cai = await makeUser(db, { email: "cai@exemplo.com" });
    const s = (status: string) => ({ id: `s_${status}`, customer: "c", status, currency: "usd", amount: 200, currentPeriodEnd: null, cancelAtPeriodEnd: false, canceledAt: null });
    await upsertSubscription(db, ana, "cus_a", s("active"));
    await upsertSubscription(db, bia, "cus_b", s("canceled"));
    await upsertSubscription(db, cai, "cus_c", s("past_due"));
    await recordPageView(db, view("a1", "/", ana), 10);
    await recordPageView(db, view("a1", "/x", ana), 11);
    await recordPageView(db, view("a2", "/", ana), 12);
    await recordPageView(db, view("b1", "/", bia), 10);
    await recordPageView(db, view("c1", "/", cai), 1);
    expect((await leadFunnel(db, 5)).paid).toBe(2);
  });
});
