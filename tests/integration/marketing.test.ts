import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "@/server/accounts";
import type { Db } from "@/server/db";
import { listAudience, sendCampaign, unsubscribeAttempt, unsubscribeByToken, unsubscribeUrl } from "@/server/marketing";
import type { MailMessage, Mailer } from "@/server/mailer";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

const optIn = (id: number) => db.run("UPDATE users SET marketing_opt_in = TRUE, marketing_opt_in_at = 1 WHERE id = $1", [id]);
const sub = (userId: number, status: string) =>
  db.run("INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES ($1, $2, $3, 1)", [userId, `cus_${userId}`, status]);
async function campaign(audience = "all") {
  const [r] = await db.query<{ id: number }>(
    "INSERT INTO email_campaigns (template, audience, subject, body, created_at) VALUES ('announcement', $1, 'Oi', 'Texto', 1) RETURNING id",
    [audience],
  );
  return r.id;
}
const recorder = (failOn?: number) => {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    async send(m) {
      if (sent.length + 1 === failOn) throw new Error("falhou");
      sent.push(m);
    },
  };
  return { sent, mailer };
};

describe("audiências", { timeout: 30_000 }, () => {
  it("só quem tem opt-in, nunca o dono, e churned só canceladas", async () => {
    const a = await makeUser(db, { email: "a@x.com" });
    const b = await makeUser(db, { email: "b@x.com" });
    const c = await makeUser(db, { email: "c@x.com" });
    await makeUser(db, { email: "semoptin@x.com" });
    const owner = await makeUser(db, { email: "dono@x.com" });
    await db.run("UPDATE users SET is_platform_admin = TRUE WHERE id = $1", [owner]);
    for (const id of [a, b, c, owner]) await optIn(id);
    await sub(a, "canceled");
    await sub(b, "active");
    expect((await listAudience(db, "all")).map((u) => u.id).sort()).toEqual([a, b, c]);
    expect((await listAudience(db, "churned")).map((u) => u.id)).toEqual([a]);
    expect((await listAudience(db, "active")).map((u) => u.id)).toEqual([b]);
    expect((await listAudience(db, "neverSubscribed")).map((u) => u.id)).toEqual([c]);
  });
});

describe("descadastro", () => {
  it("o token desliga o opt-in; token inválido não muda nada", async () => {
    const id = await makeUser(db);
    await optIn(id);
    const url = await unsubscribeUrl(db, id, "https://nf.app");
    expect(await unsubscribeUrl(db, id, "https://nf.app")).toBe(url);
    expect(await unsubscribeByToken(db, "lixo")).toBe(false);
    expect(await listAudience(db, "all")).toHaveLength(1);
    expect(await unsubscribeByToken(db, url.split("/").pop()!)).toBe(true);
    expect(await listAudience(db, "all")).toHaveLength(0);
  });
});

describe("sendCampaign", () => {
  it("envia em lotes sem repetir", async () => {
    for (const n of ["a", "b", "c"]) await optIn(await makeUser(db, { email: `${n}@x.com` }));
    const id = await campaign();
    const { sent, mailer } = recorder();
    const args = { campaignId: id, appUrl: "https://nf.app", max: 2 };
    expect(await sendCampaign(db, mailer, args)).toEqual({ sent: 2, remaining: 1 });
    expect(await sendCampaign(db, mailer, args)).toEqual({ sent: 1, remaining: 0 });
    expect(await sendCampaign(db, mailer, args)).toEqual({ sent: 0, remaining: 0 });
    expect(sent).toHaveLength(3);
    expect(sent[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0].headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/nf\.app\/api\/unsubscribe\/.+>$/);
    expect(sent[0].html).toContain("https://nf.app/unsubscribe/"); // o rodapé continua na página
  });

  it("falha do mailer no 2º não grava o 2º", async () => {
    for (const n of ["a", "b", "c"]) await optIn(await makeUser(db, { email: `${n}@x.com` }));
    const id = await campaign();
    const { mailer } = recorder(2);
    await expect(sendCampaign(db, mailer, { campaignId: id, appUrl: "https://nf.app" })).rejects.toThrow("falhou");
    const rows = await db.query("SELECT 1 FROM email_campaign_recipients WHERE campaign_id = $1", [id]);
    expect(rows).toHaveLength(1);
  });
});

describe("sendCampaign, concorrência", () => {
  it("duas chamadas ao mesmo tempo enviam cada pessoa uma vez", async () => {
    for (const n of ["a", "b", "c"]) await optIn(await makeUser(db, { email: `${n}@x.com` }));
    const id = await campaign();
    const { sent, mailer } = recorder();
    const slow: Mailer = { send: async (m) => { await new Promise((r) => setTimeout(r, 5)); await mailer.send(m); } };
    const args = { campaignId: id, appUrl: "https://nf.app" };
    await Promise.all([sendCampaign(db, slow, args), sendCampaign(db, slow, args)]);
    expect(sent.map((m) => m.to).sort()).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  it("quem se descadastra depois de lida a audiência e antes da sua vez é pulado", async () => {
    const ids: number[] = [];
    for (const n of ["a", "b"]) { const u = await makeUser(db, { email: `${n}@x.com` }); await optIn(u); ids.push(u); }
    const id = await campaign();
    const { sent, mailer } = recorder();
    const hook: Mailer = { send: async (m) => { await mailer.send(m); await db.run("UPDATE users SET marketing_opt_in = FALSE WHERE id = $1", [ids[1]]); } };
    const r = await sendCampaign(db, hook, { campaignId: id, appUrl: "https://nf.app" });
    expect(sent.map((m) => m.to)).toEqual(["a@x.com"]);
    expect(r.sent).toBe(1);
  });
});

describe("limite do descadastro", () => {
  it("só token inválido conta: 40 válidos passam, o 31º inválido é barrado", async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 40; i++) {
      const u = await makeUser(db, { email: `u${i}@x.com` });
      tokens.push((await unsubscribeUrl(db, u, "https://nf.app")).split("/").pop()!);
    }
    for (const t of tokens) expect((await unsubscribeAttempt(db, t, "1.2.3.4")).result).toBe("ok");
    for (let i = 0; i < 30; i++) expect((await unsubscribeAttempt(db, `x${i}`, "1.2.3.4")).result).toBe("invalid");
    expect((await unsubscribeAttempt(db, "x31", "1.2.3.4")).result).toBe("limited");
  });

  it("só registra quando o opt-in realmente mudou", async () => {
    const u = await makeUser(db);
    const token = (await unsubscribeUrl(db, u, "https://nf.app")).split("/").pop()!;
    expect(await unsubscribeByToken(db, token)).toBe(true); // já estava desligado
    const n = await db.query("SELECT 1 FROM activity_logs WHERE action = 'marketing.optInChanged'");
    expect(n).toHaveLength(0);
  });
});

describe("cadastro", () => {
  const base = { name: "Ana", username: "ana", password: "segredo123", city: { label: "X", latitude: 0, longitude: 0, countryCode: "BR" }, climate: { zone: "subtropical", estimated: false, hemisphere: "south" } } as const;
  it("caixa desmarcada grava false; marcada grava true com data", async () => {
    const a = await createUser(db, { ...base, email: "a@x.com" });
    const b = await createUser(db, { ...base, email: "b@x.com", username: "bia", marketing: true });
    const [ra] = await db.query<{ marketing_opt_in: boolean; marketing_opt_in_at: number | null }>("SELECT marketing_opt_in, marketing_opt_in_at FROM users WHERE id = $1", [a]);
    const [rb] = await db.query<{ marketing_opt_in: boolean; marketing_opt_in_at: number | null }>("SELECT marketing_opt_in, marketing_opt_in_at FROM users WHERE id = $1", [b]);
    expect(ra).toEqual({ marketing_opt_in: false, marketing_opt_in_at: null });
    expect(rb.marketing_opt_in).toBe(true);
    expect(Number(rb.marketing_opt_in_at)).toBeGreaterThan(0);
  });
});
