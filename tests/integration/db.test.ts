import { describe, expect, it } from "vitest";
import { testDb } from "../helpers/db";

const TABLES = [
  "activity_logs",
  "dev_emails",
  "diary_entries",
  "email_verification_tokens",
  "farm_animals",
  "farm_crops",
  "login_attempts",
  "password_reset_tokens",
  "rate_limits",
  "schema_migrations",
  "sessions",
  "users",
  "weather_cache",
];

describe("banco", () => {
  it("cria todas as tabelas, todas com RLS ligado (API pública do Supabase não lê nada)", async () => {
    const db = await testDb();
    const rows = await db.query<{ name: string; rls: boolean }>(
      "SELECT relname AS name, relrowsecurity AS rls FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace ORDER BY relname",
    );
    expect(rows).toEqual(TABLES.map((name) => ({ name, rls: true })));
  });

  it("recusa dois usuários com o mesmo e-mail", async () => {
    const db = await testDb();
    const insert = `INSERT INTO users (name, email, username, password_hash, city_label, latitude, longitude, country_code,
      climate_zone, hemisphere, created_at) VALUES ('A', 'a@x.com', $1, 'h', 'C', 0, 0, 'BR', 'tropical', 'south', 0)`;
    await db.run(insert, ["a1"]);
    (await expect(db.run(insert, ["a2"]))).rejects.toMatchObject({ code: "23505", constraint: "users_email_key" });
  });

  it("transação desfaz tudo se algo falha no meio", async () => {
    const db = await testDb();
    await expect(
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO weather_cache (key, payload, fetched_at) VALUES ('k', 'p', 1)");
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
    expect(await db.query("SELECT * FROM weather_cache")).toEqual([]);
  });
});
