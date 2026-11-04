import { expect, it } from "vitest";
import { listActivityWithUsernames, logActivity } from "@/server/activity-log";
import { getPlatformStats, logRequestError } from "@/server/monitoring";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const HORA = 60 * 60_000;
const DIA = 24 * HORA;
const AGORA = 100 * DIA;

it("com 3 contas, 1 login certo e 2 errados nas últimas 24 h, devolve esses números", async () => {
  const db = await testDb();
  const ana = await makeUser(db, { email: "ana@exemplo.com" });
  await makeUser(db, { email: "bia@exemplo.com" });
  await makeUser(db, { email: "caio@exemplo.com" });
  await logActivity(db, { userId: ana, action: "auth.login", ip: "" }, AGORA - HORA);
  await logActivity(db, { userId: null, action: "auth.loginFailed", ip: "" }, AGORA - 2 * HORA);
  await logActivity(db, { userId: null, action: "auth.loginFailed", ip: "" }, AGORA - 3 * HORA);
  // fora das 24 h: não conta
  await logActivity(db, { userId: null, action: "auth.loginFailed", ip: "" }, AGORA - 2 * DIA);
  const stats = await getPlatformStats(db, AGORA);
  expect(stats.users).toBe(3);
  expect(stats.logins24h).toEqual({ ok: 1, failed: 2 });
});

it("conta contas novas em 7 dias, sessões ativas, bloqueios, erros e cache do tempo", async () => {
  const db = await testDb();
  await makeUser(db, { email: "velha@exemplo.com" });
  await db.run("UPDATE users SET created_at = $1", [AGORA - 30 * DIA]);
  const nova = await makeUser(db, { email: "nova@exemplo.com" });
  await db.run("UPDATE users SET created_at = $1 WHERE id = $2", [AGORA - DIA, nova]);

  // sessão ativa, sessão parada há 2 h e sessão vencida
  const sessao = "INSERT INTO sessions (user_id, token_hash, expires_at, last_seen_at) VALUES ($1, $2, $3, $4)";
  await db.run(sessao, [nova, "a", AGORA + DIA, AGORA - 10 * 60_000]);
  await db.run(sessao, [nova, "b", AGORA + DIA, AGORA - 2 * HORA]);
  await db.run(sessao, [nova, "c", AGORA - 1, AGORA - 60_000]);

  // "bloqueado": 5 erros em 15 min; "liberado": 5 erros e depois um acerto; "pouco": 4 erros; "antigo": erros há 1 h
  const tentativa = "INSERT INTO login_attempts (identifier, attempted_at, success) VALUES ($1, $2, $3)";
  for (let i = 1; i <= 5; i++) {
    await db.run(tentativa, ["bloqueado", AGORA - i * 60_000, 0]);
    await db.run(tentativa, ["liberado", AGORA - (i + 1) * 60_000, 0]);
    await db.run(tentativa, ["antigo", AGORA - HORA - i, 0]);
    if (i < 5) await db.run(tentativa, ["pouco", AGORA - i * 60_000, 0]);
  }
  await db.run(tentativa, ["liberado", AGORA - 60_000, 1]);

  await logActivity(db, { userId: null, action: "security.rateLimited", ip: "" }, AGORA - HORA);
  await logActivity(db, { userId: null, action: "security.rateLimited", ip: "" }, AGORA - 2 * DIA);
  await logRequestError(db, "/dashboard", "x".repeat(500), AGORA - HORA);
  await logRequestError(db, "/weather", "falhou", AGORA - 2 * DIA);
  await db.run("INSERT INTO weather_cache (key, payload, fetched_at) VALUES ('k', '{}', 0)");

  const stats = await getPlatformStats(db, AGORA);
  expect(stats.newUsers7d).toBe(1);
  expect(stats.activeSessions).toBe(1);
  expect(stats.lockedAccounts).toBe(1);
  expect(stats.rateLimited24h).toBe(1);
  expect(stats.errors24h).toBe(1);
  expect(stats.recentErrors).toEqual([
    { at: AGORA - HORA, route: "/dashboard", message: "x".repeat(300) },
    { at: AGORA - 2 * DIA, route: "/weather", message: "falhou" },
  ]);
  expect(stats.weatherCacheEntries).toBe(1);
  expect(stats.dbLatencyMs).toBeGreaterThanOrEqual(0);
});

it("lista atividades com o username de cada conta (sem conta: null)", async () => {
  const db = await testDb();
  const ana = await makeUser(db, { email: "ana@exemplo.com" });
  await logActivity(db, { userId: ana, action: "auth.login", ip: "" }, 2);
  await logActivity(db, { userId: null, action: "auth.loginFailed", ip: "" }, 1);
  const rows = await listActivityWithUsernames(db, {});
  expect(rows.map((r) => [r.action, r.username])).toEqual([["auth.login", "ana"], ["auth.loginFailed", null]]);
  expect(await listActivityWithUsernames(db, { userId: ana, limit: Number.NaN })).toHaveLength(1);
});
