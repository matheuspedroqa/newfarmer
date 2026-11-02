import { describe, expect, it } from "vitest";
import { testDb } from "../helpers/db";

describe("openDb", () => {
  it("cria todas as tabelas", () => {
    const db = testDb();
    const names = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[]
    ).map((r) => r.name);
    expect(names).toEqual([
      "dev_emails",
      "diary_entries",
      "farm_animals",
      "farm_crops",
      "login_attempts",
      "password_reset_tokens",
      "sessions",
      "users",
      "weather_cache",
    ]);
  });

  it("recusa dois usuários com o mesmo e-mail", () => {
    const db = testDb();
    const insert = db.prepare(
      `INSERT INTO users (name, email, password_hash, city_label, latitude, longitude, country_code,
        climate_zone, hemisphere, created_at) VALUES ('A', 'a@x.com', 'h', 'C', 0, 0, 'BR', 'tropical', 'south', 0)`,
    );
    insert.run();
    expect(() => insert.run()).toThrow(/UNIQUE/);
  });
});
