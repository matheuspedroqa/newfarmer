import { describe, expect, it } from "vitest";
import { AUDIENCES, audienceCount, createCampaign, listAudience, listCampaigns, sendOrCreateCampaign } from "@/server/marketing";
import { leadFunnel, listLeads, recordPageView } from "@/server/page-views";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const view = (visitorId: string, path: string, userId: number | null = null) => ({ visitorId, userId, path, referrer: "" });

describe("listLeads", () => {
  it("agrupa por visitante, acha o passo mais avançado, a última página e ordena pela última visita", async () => {
    const db = await testDb();
    const ana = await makeUser(db, { email: "ana@x.com" });
    await db.run("INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, 'cus_a', 'active', 1)", [ana]);
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
    expect(leads.map((l) => l.visitorId)).toEqual(["fora", "novo", "meio", "pago"]);
    expect(leads[0]).toMatchObject({ furthestStep: null, lastPath: "/termos" });
    expect(leads[1]).toMatchObject({ furthestStep: "/", lastPath: "/pt", pages: 1, firstSeen: 300, lastSeen: 300, user: null, subscribed: false });
    expect(leads[2]).toMatchObject({ furthestStep: "/subscribe", lastPath: "/termos", pages: 3 });
    expect(leads[3]).toMatchObject({ furthestStep: "paid", lastPath: "/dashboard", subscribed: true, user: { id: ana, username: "ana", email: "ana@x.com" } });

    expect((await listLeads(db, { since: 50, before: 220 })).map((l) => l.visitorId)).toEqual(["pago"]);
    expect(await listLeads(db, { since: 50, limit: 1 })).toHaveLength(1);
  });

  it("não mostra o dono do site, nem o funil", async () => {
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
