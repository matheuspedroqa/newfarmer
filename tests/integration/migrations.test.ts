import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS, migrate } from "@/server/migrations";
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
    const db = pgliteDb(lite);
    await migrate(db);
    expect(await db.query("SELECT name FROM users")).toEqual([{ name: "Ana" }]);
  });
});
