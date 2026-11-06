import { describe, expect, it } from "vitest";
import { AUDIENCES, audienceCount, createCampaign, listAudience, listCampaigns, sendOrCreateCampaign } from "@/server/marketing";
import { leadFunnel, leadSources, listLeads, recordPageView } from "@/server/page-views";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const view = (visitorId: string, path: string, userId: number | null = null) => ({ visitorId, userId, path, referrer: "" });

describe("listLeads e leadFunnel", () => {
  it("junta contas (mesmo sem estatística) e visitantes sem conta, com o passo mais avançado de cada um", async () => {
    const db = await testDb();
    const ana = await makeUser(db, { email: "ana@x.com" });
    const bia = await makeUser(db, { email: "bia@x.com" });
    const carla = await makeUser(db, { email: "carla@x.com" });
    for (const [id, at] of [[ana, 90], [bia, 150], [carla, 160]]) await db.run("UPDATE users SET created_at = $2 WHERE id = $1", [id, at]);
    await db.run("INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, 'cus_a', 'active', 1)", [ana]);
    await db.run("INSERT INTO farm_animals (user_id, animal_id, count) VALUES ($1, 'cows', 3)", [bia]); // escolheu a criação, sem estatística
    await db.run("INSERT INTO subscriptions (user_id, stripe_customer_id, updated_at) VALUES ($1, 'cus_c', 1)", [carla]); // abriu o pagamento e não pagou
    await recordPageView(db, view("pago", "/"), 100);
    await recordPageView(db, view("pago", "/register"), 110);
    await recordPageView(db, view("pago", "/dashboard", ana), 120);
    await recordPageView(db, view("meio", "/"), 200);
    await recordPageView(db, view("meio", "/subscribe/ok"), 210);
    await recordPageView(db, view("meio", "/termos"), 220);
    await recordPageView(db, view("novo", "/pt"), 300);
    await recordPageView(db, view("antigo", "/"), 5);
    await recordPageView(db, view("fora", "/termos"), 400);

    const leads = await listLeads(db, { since: 50 });
    expect(leads.map((l) => l.id)).toEqual(["v:fora", "v:novo", "v:meio", `u:${carla}`, `u:${bia}`, `u:${ana}`]);
    expect(leads[0]).toMatchObject({ furthestStep: null, lastPath: "/termos" });
    expect(leads[1]).toMatchObject({ furthestStep: "/", lastPath: "/pt", pages: 1, firstSeen: 300, lastSeen: 300, user: null, subscribed: false });
    expect(leads[2]).toMatchObject({ furthestStep: "/subscribe", lastPath: "/termos", pages: 3 });
    expect(leads[3]).toMatchObject({ furthestStep: "/subscribe", pages: 0, lastPath: null, subscribed: false });
    expect(leads[4]).toMatchObject({ furthestStep: "/welcome", pages: 0, lastPath: null, firstSeen: 150, lastSeen: 150, user: { id: bia, username: "bia", email: "bia@x.com" } });
    expect(leads[5]).toMatchObject({ furthestStep: "paid", lastPath: "/dashboard", pages: 3, firstSeen: 90, lastSeen: 120, subscribed: true });

    expect((await listLeads(db, { since: 50, before: 220 })).map((l) => l.id)).toEqual([`u:${carla}`, `u:${bia}`, `u:${ana}`]);
    expect(await listLeads(db, { since: 50, limit: 1 })).toHaveLength(1);
    // Cada passo conta quem chegou pelo menos até ele: nunca passa do anterior.
    expect(await leadFunnel(db, 50)).toEqual({ "/": 5, "/register": 4, "/welcome": 4, "/subscribe": 3, paid: 1 });
  });

  it("mostra de onde acessou por último; conta sem visita medida mostra a cidade do cadastro", async () => {
    const db = await testDb();
    const ana = await makeUser(db, { email: "ana@x.com" });
    const bia = await makeUser(db, { email: "bia@x.com" });
    await recordPageView(db, { ...view("v1", "/"), city: "Lisboa", country: "PT" }, 100);
    await recordPageView(db, view("v1", "/register"), 110); // sem país (fora da Vercel): não apaga o último local
    await recordPageView(db, { ...view("v2", "/dashboard", ana), city: "São Paulo", country: "BR" }, 120);
    const byId = new Map((await listLeads(db, { since: 0 })).map((l) => [l.id, l.location]));
    expect(byId.get("v:v1")).toEqual({ city: "Lisboa", country: "PT", signup: false });
    expect(byId.get(`u:${ana}`)).toEqual({ city: "São Paulo", country: "BR", signup: false });
    expect(byId.get(`u:${bia}`)).toMatchObject({ signup: true });
  });

  it("de onde vêm: o site e a página da primeira visita, com quem criou conta e quem assinou", async () => {
    const db = await testDb();
    const ana = await makeUser(db, { email: "ana@x.com" });
    await makeUser(db, { email: "bia@x.com" }); // sem estatística
    await db.run("INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, 'cus_a', 'active', 1)", [ana]);
    await recordPageView(db, { ...view("g1", "/es/que-plantar/espana/noviembre"), referrer: "www.google.com" }, 100);
    await recordPageView(db, { ...view("g1", "/dashboard", ana), referrer: "checkout.stripe.com" }, 110); // só a primeira visita conta
    await recordPageView(db, { ...view("g2", "/what-to-plant/brazil/march"), referrer: "www.google.com" }, 120);
    await recordPageView(db, view("d1", "/es"), 130);
    expect(await leadSources(db, 0)).toEqual([
      { source: "www.google.com", entry: "guide", leads: 2, accounts: 1, paid: 1 },
      { source: null, entry: null, leads: 1, accounts: 1, paid: 0 },
      { source: "", entry: "home", leads: 1, accounts: 0, paid: 0 },
    ]);
    const leads = await listLeads(db, { since: 0 });
    expect(leads.find((l) => l.id === `u:${ana}`)?.source).toBe("www.google.com");
    expect(leads.find((l) => l.id === "v:d1")?.furthestStep).toBe("/"); // /es é a página inicial em espanhol
  });

  it("não mostra o dono do site, nem no funil", async () => {
    const db = await testDb();
    const dono = await makeUser(db, { email: "dono@x.com" });
    await db.run("UPDATE users SET is_platform_admin = TRUE WHERE id = $1", [dono]);
    await recordPageView(db, view("d", "/"), 100);
    await recordPageView(db, view("d", "/admin", dono), 110);
    expect(await listLeads(db, { since: 0 })).toEqual([]);
    expect((await leadFunnel(db, 0))["/"]).toBe(0);
  });
});

describe("campanhas", () => {
  it("audienceCount bate com listAudience e listCampaigns traz a mais nova primeiro com quantos receberam", async () => {
    const db = await testDb();
    const a = await makeUser(db, { email: "a@x.com" });
    await makeUser(db, { email: "b@x.com" });
    await db.run("UPDATE users SET marketing_opt_in = TRUE WHERE id = $1", [a]);
    for (const audience of AUDIENCES) expect(await audienceCount(db, audience)).toBe((await listAudience(db, audience)).length);
    expect(await audienceCount(db, "all")).toBe(1);

    const first = await createCampaign(db, { template: "weMissYou", audience: "all", subject: "", body: "", createdBy: a });
    const second = await createCampaign(db, { template: "announcement", audience: "active", subject: "Oi", body: "Texto", createdBy: a });
    await db.run("INSERT INTO email_campaign_recipients (campaign_id, user_id, sent_at) VALUES ($1, $2, 1)", [first, a]);
    const list = await listCampaigns(db);
    expect(list.map((c) => [c.id, c.sent])).toEqual([[second, 0], [first, 1]]);
    expect(list[0]).toMatchObject({ template: "announcement", audience: "active", subject: "Oi", remaining: 0 });
    expect(list[1].remaining).toBe(0); // o único do público já recebeu
  });
});

describe("sendOrCreateCampaign (continuar envio)", () => {
  const sentTo: string[] = [];
  const mailer = { async send(m: { to: string }) { sentTo.push(m.to); } };
  it("cria no primeiro lote, continua pelo id sem repetir ninguém e recusa id inventado sem criar nada", async () => {
    const db = await testDb();
    const dono = await makeUser(db, { email: "dono@x.com" });
    for (const n of ["a", "b", "c"]) {
      const id = await makeUser(db, { email: `${n}@x.com` });
      await db.run("UPDATE users SET marketing_opt_in = TRUE WHERE id = $1", [id]);
    }
    const campaign = { template: "weMissYou" as const, audience: "all" as const, subject: "", body: "" };
    const first = await sendOrCreateCampaign(db, mailer as never, { campaignId: null, campaign, createdBy: dono, appUrl: "http://x", max: 2 });
    expect(first).toMatchObject({ sent: 2, remaining: 1 });
    const id = (first as { campaignId: number }).campaignId;
    expect((await listCampaigns(db))[0]).toMatchObject({ id, sent: 2, remaining: 1 });
    const second = await sendOrCreateCampaign(db, mailer as never, { campaignId: id, createdBy: dono, appUrl: "http://x", max: 2 });
    expect(second).toEqual({ campaignId: id, sent: 1, remaining: 0 });
    expect(new Set(sentTo).size).toBe(3);
    expect(sentTo).toHaveLength(3);
    expect(await sendOrCreateCampaign(db, mailer as never, { campaignId: id, createdBy: dono, appUrl: "http://x", max: 2 })).toMatchObject({ sent: 0, remaining: 0 });

    for (const bad of [9999, -1, 1.5]) {
      expect(await sendOrCreateCampaign(db, mailer as never, { campaignId: bad, campaign, createdBy: dono, appUrl: "http://x" })).toEqual({ error: "invalidCampaign" });
    }
    expect(await listCampaigns(db)).toHaveLength(1);
    expect(sentTo).toHaveLength(3);
    expect((await listCampaigns(db))[0].remaining).toBe(0);
  });

  it("falha do envio devolve o id da campanha criada", async () => {
    const db = await testDb();
    const dono = await makeUser(db, { email: "dono@x.com" });
    const a = await makeUser(db, { email: "a@x.com" });
    await db.run("UPDATE users SET marketing_opt_in = TRUE WHERE id = $1", [a]);
    const broken = { async send() { throw new Error("x"); } };
    const r = await sendOrCreateCampaign(db, broken as never, { campaignId: null, campaign: { template: "weMissYou", audience: "all", subject: "", body: "" }, createdBy: dono, appUrl: "http://x" });
    expect(r).toMatchObject({ error: "sendFailed", campaignId: expect.any(Number) });
  });
});
