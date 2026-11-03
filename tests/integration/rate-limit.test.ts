import { afterEach, expect, it, vi } from "vitest";
import { hit, limitByIp, purgeRateLimits } from "@/server/rate-limit";
import { testDb } from "../helpers/db";

afterEach(() => vi.unstubAllEnvs());

it("deixa passar até o limite, bloqueia depois e libera quando a janela vira", async () => {
  const db = await testDb();
  for (let i = 0; i < 3; i++) expect((await hit(db, "login:1.2.3.4", 3, 60_000, 1000)).ok).toBe(true);
  expect(await hit(db, "login:1.2.3.4", 3, 60_000, 2000)).toEqual({ ok: false, retryAfterMs: 59_000 });
  expect((await hit(db, "login:5.6.7.8", 3, 60_000, 2000)).ok).toBe(true); // outro IP não é afetado
  expect((await hit(db, "login:1.2.3.4", 3, 60_000, 61_000)).ok).toBe(true);
});

it("IP 'local' não é limitado fora de produção", async () => {
  const db = await testDb();
  vi.stubEnv("NODE_ENV", "test");
  for (let i = 0; i < 20; i++) expect((await limitByIp(db, "login", "local")).ok).toBe(true);
  expect(await db.query("SELECT 1 FROM rate_limits")).toEqual([]);
});

it("IP 'local' é limitado em produção, como qualquer IP", async () => {
  const db = await testDb();
  vi.stubEnv("NODE_ENV", "production");
  for (let i = 0; i < 10; i++) expect((await limitByIp(db, "login", "local")).ok).toBe(true);
  expect((await limitByIp(db, "login", "local")).ok).toBe(false);
});

it("IP real é limitado fora de produção", async () => {
  const db = await testDb();
  for (let i = 0; i < 5; i++) expect((await limitByIp(db, "signup", "203.0.113.9")).ok).toBe(true);
  expect((await limitByIp(db, "signup", "203.0.113.9")).ok).toBe(false);
});

it("limpa só linhas com mais de um dia", async () => {
  const db = await testDb();
  await hit(db, "a", 1, 1000, 1000);
  await hit(db, "b", 1, 1000, 90_000_000);
  expect(await purgeRateLimits(db, 90_000_000)).toBe(1);
});
