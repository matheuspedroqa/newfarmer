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
