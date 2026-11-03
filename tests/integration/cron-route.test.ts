import { describe, expect, it, vi } from "vitest";
import { handleCron } from "@/server/cron-forecast";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";

const req = (authorization?: string) =>
  new Request("http://localhost/api/cron/forecast", { headers: authorization ? { authorization } : {} });

describe("rota do registro diário", () => {
  it("401 sem cabeçalho, com segredo errado e sem CRON_SECRET", async () => {
    const db = await testDb();
    const deps = { db, provider: createFakeWeatherProvider() };
    vi.stubEnv("CRON_SECRET", "segredo-certo");
    expect((await handleCron(req(), deps)).status).toBe(401);
    expect((await handleCron(req("Bearer errado"), deps)).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await handleCron(req("Bearer "), deps)).status).toBe(401);
    expect((await db.query("SELECT 1 FROM forecast_snapshots")).length).toBe(0);
    vi.unstubAllEnvs();
  });

  it("200 com o segredo certo e grava a linha", async () => {
    const db = await testDb();
    vi.stubEnv("CRON_SECRET", "segredo-certo");
    const res = await handleCron(req("Bearer segredo-certo"), { db, provider: createFakeWeatherProvider() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect((await db.query("SELECT 1 FROM forecast_snapshots")).length).toBe(1);
    vi.unstubAllEnvs();
  });

  it("502 quando o provedor falha", async () => {
    const db = await testDb();
    vi.stubEnv("CRON_SECRET", "segredo-certo");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleCron(req("Bearer segredo-certo"), { db, provider: createFakeWeatherProvider({ failForecast: true }) });
    expect(res.status).toBe(502);
    vi.unstubAllEnvs();
  });
});
