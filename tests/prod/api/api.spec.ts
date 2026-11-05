import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { cookieHeader, userOf } from "../helpers";

test.describe("APIs", () => {
  test("GET /api/cities: busca cidades, ignora busca curta e aguenta busca enorme", async ({ request }) => {
    const res = await request.get("/api/cities?q=Lisboa&locale=pt");
    expect(res.status()).toBe(200);
    const list = (await res.json()) as { label: string; latitude: number; longitude: number; countryCode: string }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toMatchObject({ label: expect.stringContaining("Lisboa"), countryCode: "PT" });
    expect(await (await request.get("/api/cities?q=a")).json()).toEqual([]);
    const huge = await request.get(`/api/cities?q=${"x".repeat(5000)}`);
    expect(huge.status()).toBeLessThan(500);
  });

  test("GET /api/account/data: sem login 401; logado baixa só os próprios dados, sem cache", async ({ request }) => {
    expect((await request.get("/api/account/data", { headers: { cookie: "" } })).status()).toBe(401);
    const a = userOf("paidA");
    const res = await request.get("/api/account/data", { headers: { cookie: cookieHeader("paidA") } });
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["content-disposition"]).toContain(`newfarmer-${a.username}.json`);
    const body = await res.text();
    expect(JSON.parse(body).account.username).toBe(a.username);
    expect(body).not.toContain(userOf("paidB").username);
    // Trocar o id na URL não muda nada: o id vem da sessão.
    const other = await request.get("/api/account/data?userId=1&username=admin", { headers: { cookie: cookieHeader("paidA") } });
    expect(JSON.parse(await other.text()).account.username).toBe(a.username);
  });

  test("POST /api/track: sem consentimento, corpo grande ou inválido não grava e responde 204", async ({ request }) => {
    const visitor = `nf_vid=${randomUUID()}`;
    expect((await request.post("/api/track", { data: { path: "/" }, headers: { cookie: `${visitor}; nf_consent=essential` } })).status()).toBe(204);
    expect((await request.post("/api/track", { data: "{não é json", headers: { cookie: `${visitor}; nf_consent=all`, "content-type": "application/json" } })).status()).toBe(204);
    expect((await request.post("/api/track", { data: { path: "/".repeat(5000) }, headers: { cookie: `${visitor}; nf_consent=all` } })).status()).toBe(204);
    expect((await request.post("/api/track", { data: { path: "/admin/leads" }, headers: { cookie: `${visitor}; nf_consent=all` } })).status()).toBe(204);
    expect((await request.post("/api/track", { data: { path: "/" }, headers: { cookie: "nf_vid=nao-e-uuid; nf_consent=all" } })).status()).toBe(204);
  });

  test("POST /api/stripe/webhook: sem assinatura, assinatura falsa e corpo enorme são recusados", async ({ request }) => {
    const event = { id: "evt_fake", type: "customer.subscription.updated", data: { object: { id: "sub_x", customer: "cus_x", status: "active" } } };
    expect((await request.post("/api/stripe/webhook", { data: event })).status()).toBe(401);
    const t = Math.floor(Date.now() / 1000);
    expect((await request.post("/api/stripe/webhook", { data: event, headers: { "stripe-signature": `t=${t},v1=${"ab".repeat(32)}` } })).status()).toBe(401);
    const old = await request.post("/api/stripe/webhook", { data: event, headers: { "stripe-signature": `t=${t - 3600},v1=${"ab".repeat(32)}` } });
    expect(old.status()).toBe(401);
    expect((await request.post("/api/stripe/webhook", { data: "x".repeat(1_100_000), headers: { "content-type": "application/json" } })).status()).toBe(413);
    expect((await request.get("/api/stripe/webhook")).status()).toBe(405);
  });

  test("GET /api/cron/forecast: sem a chave certa responde 401", async ({ request }) => {
    expect((await request.get("/api/cron/forecast")).status()).toBe(401);
    expect((await request.get("/api/cron/forecast", { headers: { authorization: "Bearer chute-qualquer" } })).status()).toBe(401);
  });

  test("POST /api/unsubscribe/<token>: token inventado responde igual ao válido (nada a revelar)", async ({ request }) => {
    expect((await request.post(`/api/unsubscribe/${randomUUID()}`)).status()).toBe(200);
    expect((await request.post("/api/unsubscribe/%27%20OR%201%3D1--")).status()).toBe(200);
  });

  test("rotas de teste (/api/dev/*) e a caixa de e-mails de teste não existem em produção", async ({ request }) => {
    const json = { "content-type": "application/json" };
    for (const path of ["/api/dev/make-admin", "/api/dev/set-subscription", "/api/dev/ensure-customer"]) {
      expect((await request.post(path, { data: { username: userOf("paidA").username, status: "active" }, headers: json })).status(), path).toBe(404);
    }
    expect((await request.get("/api/dev/page-views?visitor=x")).status()).toBe(404);
    expect((await request.get("/dev/inbox")).status()).toBe(404);
  });

  test("métodos e rotas que não existem", async ({ request }) => {
    expect((await request.delete("/api/account/data")).status()).toBe(405);
    expect((await request.post("/api/cities")).status()).toBe(405);
    expect((await request.get("/api/nao-existe")).status()).toBe(404);
  });
});
