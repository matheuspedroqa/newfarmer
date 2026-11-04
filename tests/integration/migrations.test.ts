import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS, applyMigrations, migrate } from "@/server/migrations";
import { pgliteDb } from "@/server/db";

describe("migrações", () => {
  it("aplica todas uma vez e, na segunda, nenhuma", async () => {
    const db = pgliteDb(new PGlite());
    expect(await migrate(db)).toEqual(MIGRATIONS.map((m) => m.id));
    expect(await migrate(db)).toEqual([]);
  });

  it("banco antigo (só com o SCHEMA de antes) é reconhecido como migração 1 sem perder dados", async () => {
    const lite = new PGlite();
    await lite.exec(MIGRATIONS[0].sql);
    await lite.exec(`INSERT INTO users (name,email,password_hash,city_label,latitude,longitude,country_code,climate_zone,hemisphere,created_at)
      VALUES ('Ana','a@x.com','h','C',0,0,'PT','temperate','north',0)`);
    const db = pgliteDb(lite, lite);
    expect(await migrate(db)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(await db.query("SELECT name FROM users")).toEqual([{ name: "Ana" }]);
    expect(await db.query("SELECT id FROM schema_migrations ORDER BY id")).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }]);
    expect(await migrate(db)).toEqual([]);
  });

  it("duas instâncias migrando ao mesmo tempo aplicam cada migração uma só vez", async () => {
    const lite = new PGlite();
    const db = pgliteDb(lite, lite);
    const [a, b] = await Promise.all([migrate(db), migrate(db)]);
    expect([...a, ...b].sort((x, y) => x - y)).toEqual(MIGRATIONS.map((m) => m.id));
  });

  it("migração que falha no meio é desfeita por inteiro", async () => {
    const lite = new PGlite();
    const db = pgliteDb(lite, lite);
    const ruim = { id: 99, name: "ruim", sql: "CREATE TABLE tmp_ruim (a INT); SELECT 1/0;" };
    await expect(applyMigrations(db, [ruim])).rejects.toThrow();
    expect(await db.query("SELECT id FROM schema_migrations")).toEqual([]);
    expect(await db.query("SELECT to_regclass('tmp_ruim') AS t")).toEqual([{ t: null }]);
  });
});
