import { expect, it, vi } from "vitest";
import { ACTIVITY_RETENTION_MS, listActivity, logActivity, purgeOld } from "@/server/activity-log";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const DIA = 24 * 60 * 60_000;

it("grava e lista do mais novo para o mais antigo, filtrando por conta e por ação", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  await logActivity(db, { userId: null, action: "auth.loginFailed", target: "ana", ip: "1.1.1.1" }, 1);
  await logActivity(db, { userId: ana, action: "auth.login", target: "ana", ip: "1.1.1.1" }, 2);
  await logActivity(db, { userId: null, action: "auth.loginFailed", target: "bia", ip: "2.2.2.2" }, 3);
  expect((await listActivity(db, {})).map((e) => e.target)).toEqual(["bia", "ana", "ana"]);
  expect((await listActivity(db, { userId: ana })).map((e) => e.action)).toEqual(["auth.login"]);
  expect(await listActivity(db, { action: "auth.loginFailed" })).toHaveLength(2);
});

it("devolve os campos em camelCase, com detalhes como objeto", async () => {
  const db = await testDb();
  await logActivity(db, { userId: 7, action: "diary.created", details: { n: 2, ok: true }, ip: "9.9.9.9" }, 5);
  expect(await listActivity(db, {})).toEqual([
    { id: 1, userId: 7, action: "diary.created", target: "", details: { n: 2, ok: true }, ip: "9.9.9.9", createdAt: 5 },
  ]);
});

it("'before' pega só o que é estritamente mais antigo e o limite máximo é 200", async () => {
  const db = await testDb();
  for (let t = 1; t <= 205; t++) await logActivity(db, { userId: null, action: "auth.login", ip: "" }, t);
  expect((await listActivity(db, { before: 3 })).map((e) => e.createdAt)).toEqual([2, 1]);
  expect(await listActivity(db, { limit: 5000 })).toHaveLength(200);
  expect(await listActivity(db, {})).toHaveLength(50);
});

it("corta o alvo em 200 caracteres", async () => {
  const db = await testDb();
  await logActivity(db, { userId: null, action: "auth.login", target: "a".repeat(500), ip: "" });
  expect((await listActivity(db, {}))[0].target).toHaveLength(200);
});

it("detalhes nunca guardam senha nem token", async () => {
  const db = await testDb();
  for (const key of ["password", "resetToken", "pwHash", "clientSecret"]) {
    await expect(
      logActivity(db, { userId: null, action: "auth.login", details: { [key]: "x" }, ip: "" }),
    ).rejects.toThrow(/proibido/);
  }
  expect(await listActivity(db, {})).toEqual([]);
});

it("purgeOld apaga logs com mais de 180 dias e rate_limits velhos, e mantém o resto", async () => {
  const db = await testDb();
  const now = 1_000 * DIA;
  await logActivity(db, { userId: null, action: "auth.login", target: "velho", ip: "" }, now - ACTIVITY_RETENTION_MS - 1);
  await logActivity(db, { userId: null, action: "auth.login", target: "novo", ip: "" }, now - ACTIVITY_RETENTION_MS + 1);
  await db.run("INSERT INTO rate_limits (key, window_start, count) VALUES ('velha', $1, 1), ('nova', $2, 1)", [now - 2 * DIA, now]);
  await purgeOld(db, now);
  expect((await listActivity(db, {})).map((e) => e.target)).toEqual(["novo"]);
  expect((await db.query("SELECT key FROM rate_limits")).map((r) => (r as { key: string }).key)).toEqual(["nova"]);
});

it("logActivity limpa de vez em quando (sorteio injetável) e falha na limpeza não quebra a gravação", async () => {
  const db = await testDb();
  const now = 1_000 * DIA;
  await logActivity(db, { userId: null, action: "auth.login", target: "velho", ip: "" }, 1);
  await logActivity(db, { userId: null, action: "auth.login", target: "a", ip: "" }, now, () => 0.9);
  expect(await listActivity(db, {})).toHaveLength(2); // sem sorteio, sem limpeza
  await logActivity(db, { userId: null, action: "auth.login", target: "b", ip: "" }, now, () => 0);
  expect((await listActivity(db, {})).map((e) => e.target)).toEqual(["b", "a"]); // "velho" sumiu

  const erro = vi.spyOn(console, "error").mockImplementation(() => {});
  const quebrado = { ...db, run: (sql: string, p?: unknown[]) => (sql.startsWith("DELETE") ? Promise.reject(new Error("x")) : db.run(sql, p)) } as typeof db;
  await expect(logActivity(quebrado, { userId: null, action: "auth.login", ip: "" }, now, () => 0)).resolves.toBeUndefined();
  expect(erro).toHaveBeenCalled();
  erro.mockRestore();
});

// --- Task 10: os caminhos reais gravam o registro ---
import { verifyCredentials } from "@/server/accounts";
import { loginTarget, logLoginAttempt, logSafely } from "@/server/activity-log";
import {
  addDiaryLogged,
  changeCityLogged,
  changePasswordLogged,
  deleteDiaryLogged,
  saveFarmLogged,
  saveLocaleLogged,
  signUpLogged,
} from "@/server/audited";
import { confirmEmail, sendVerificationEmail } from "@/server/email-verification";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";
import { createFakeWeatherProvider } from "@/server/weather/fake";

const IP = "1.1.1.1";
const SEGREDOS = /segredo123|errada-123|nova-senha-1|texto-secreto|Mimosa|token|recuperar|confirmar/i;
const resumo = (rows: Awaited<ReturnType<typeof listActivity>>) =>
  rows.map((r) => [r.action, r.userId, r.target, r.details]);

it("login certo, errado e bloqueado geram uma linha cada", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  await logLoginAttempt(db, "Ana", await verifyCredentials(db, "Ana", "segredo123"), IP);
  await logLoginAttempt(db, "Ana", await verifyCredentials(db, "Ana", "errada-123"), IP);
  await logLoginAttempt(db, "ana", { ok: false, reason: "locked" }, IP);
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([
    ["auth.loginFailed", null, "ana", { reason: "locked" }],
    ["auth.loginFailed", null, "ana", { reason: "invalid" }],
    ["auth.login", ana, "ana", {}],
  ]);
  expect(JSON.stringify(rows)).not.toMatch(SEGREDOS);
});

it("senha digitada no campo de username não vai para o registro", async () => {
  const db = await testDb();
  await makeUser(db);
  const digitado = "Minha Senha Secreta!123";
  expect(loginTarget(digitado)).toBe("");
  await logLoginAttempt(db, digitado, await verifyCredentials(db, digitado, "x"), IP);
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([["auth.loginFailed", null, "", { reason: "invalid", input: "invalid" }]]);
  expect(JSON.stringify(rows)).not.toMatch(/secreta|123/i);
});

it("cadastro grava auth.signup com o username", async () => {
  const db = await testDb();
  const provider = createFakeWeatherProvider();
  const [city] = await provider.searchCities("Curitiba", "pt");
  const r = await signUpLogged(db, provider, { name: "Ana", email: "a@e.com", username: "ana", password: "segredo123", confirmPassword: "segredo123", city }, IP);
  expect(r.ok).toBe(true);
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([["auth.signup", (r as { userId: number }).userId, "ana", {}]]);
  expect(JSON.stringify(rows)).not.toMatch(SEGREDOS);
});

it("diário criado e apagado: uma linha cada, só animal e tipo", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  const id = await addDiaryLogged(db, ana, { animalId: "cows", date: "2026-01-01", kind: "illness", animalName: "Mimosa", note: "texto-secreto" }, IP);
  expect(await deleteDiaryLogged(db, ana, id, IP)).toBe("cows");
  expect(await deleteDiaryLogged(db, ana, id, IP)).toBeNull(); // já apagado: não registra de novo
  const rows = await listActivity(db, { userId: ana });
  expect(resumo(rows)).toEqual([
    ["diary.deleted", ana, "", { animal: "cows" }],
    ["diary.created", ana, "", { animal: "cows", kind: "illness" }],
  ]);
  expect(JSON.stringify(rows)).not.toMatch(SEGREDOS);
});

it("senha trocada grava uma linha só quando dá certo", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  const user = { id: ana, username: "ana" };
  expect(await changePasswordLogged(db, user, "errada-123", "nova-senha-1", undefined, IP)).toBe("wrongPassword");
  expect(await listActivity(db, {})).toHaveLength(0);
  expect(await changePasswordLogged(db, user, "segredo123", "nova-senha-1", undefined, IP)).toBe("ok");
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([["auth.passwordChanged", ana, "ana", {}]]);
  expect(JSON.stringify(rows)).not.toMatch(SEGREDOS);
});

it("fazenda e cidade gravam farm.updated; idioma grava profile.updated", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  const provider = createFakeWeatherProvider();
  const [lisboa] = await provider.searchCities("Lisboa", "pt");
  await saveFarmLogged(db, ana, { animals: { goats: 3, chickens: 12 }, crops: ["tomato"] }, IP);
  await changeCityLogged(db, provider, ana, lisboa, IP);
  await saveLocaleLogged(db, ana, "en", IP);
  expect(resumo(await listActivity(db, {}))).toEqual([
    ["profile.updated", ana, "", { field: "locale", value: "en" }],
    ["farm.updated", ana, "", { change: "city" }],
    ["farm.updated", ana, "", { animals: 2, crops: 1 }],
  ]);
});

it("redefinição: pedido e conclusão são linhas distintas, sem token", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  const sent: { text?: string; html?: string }[] = [];
  const mailer = { send: async (m: never) => void sent.push(m) };
  await requestPasswordReset(db, mailer as never, { identifier: "ana", baseUrl: "http://x", locale: "pt", ip: IP });
  const token = (sent[0] as { html: string }).html.match(/recuperar\/([\w-]+)/)![1];
  expect(await resetPassword(db, { token, password: "nova-senha-1", ip: IP })).toBe("ok");
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([
    ["auth.passwordReset", ana, "", { step: "completed" }],
    ["auth.passwordReset", ana, "ana", { step: "requested" }],
  ]);
  expect(JSON.stringify(rows)).not.toContain(token);
});

it("confirmação de e-mail grava auth.emailConfirmed", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  const sent: unknown[] = [];
  await sendVerificationEmail(db, { send: async (m: never) => void sent.push(m) } as never, { userId: ana, baseUrl: "http://x", locale: "pt" });
  const token = (sent[0] as { html: string }).html.match(/confirmar\/([\w-]+)/)![1];
  expect(await confirmEmail(db, token, Date.now(), IP)).toEqual({ userId: ana });
  const rows = await listActivity(db, {});
  expect(resumo(rows)).toEqual([["auth.emailConfirmed", ana, "", {}]]);
  expect(JSON.stringify(rows)).not.toContain(token);
});

it("logSafely engole falha do registro (chave proibida) e não propaga", async () => {
  const db = await testDb();
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(
    logSafely(db, { userId: null, action: "auth.login", details: { password: "x" }, ip: "" }),
  ).resolves.toBeUndefined();
  expect(spy).toHaveBeenCalled();
  expect(await listActivity(db, {})).toHaveLength(0);
  spy.mockRestore();
});
