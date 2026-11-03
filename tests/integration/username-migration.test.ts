import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { usernameProblem } from "@/lib/username";
import { pgliteDb } from "@/server/db";
import { migrate, migrateUpTo } from "@/server/migrations";

async function legacyDb(emails: string[]) {
  const lite = new PGlite();
  const db = pgliteDb(lite, lite);
  await migrateUpTo(db, 4);
  for (const email of emails) {
    await db.run(`INSERT INTO users (name,email,password_hash,city_label,latitude,longitude,country_code,climate_zone,hemisphere,created_at)
      VALUES ('M',$1,'h','C',0,0,'PT','temperate','north',0)`, [email]);
  }
  await migrate(db);
  return (await db.query<{ username: string }>("SELECT username FROM users ORDER BY id")).map((r) => r.username);
}

it("contas antigas ganham username a partir do e-mail, sem repetir", async () => {
  expect(await legacyDb(["matheus@x.com", "Matheus@y.com", "ab@z.com", "admin@w.com"]))
    .toEqual(["matheus", "matheus2", "ab_user", "admin_user"]);
});

it("a conta real de hoje vira matheusps70", async () => {
  expect(await legacyDb(["matheusps70@hotmail.com"])).toEqual(["matheusps70"]);
});

it("casos difíceis: tudo único e válido", async () => {
  const usernames = await legacyDb([
    "a.b+tag@x.com", "ÁÉ@x.com", "123@x.com", "x@a.com", "x@b.com", "x@c.com",
    `${"a".repeat(40)}@x.com`, `${"a".repeat(40)}@y.com`, "root@x.com", "ana2@x.com", "ana@x.com", "ana@y.com",
  ]);
  expect(new Set(usernames).size).toBe(usernames.length);
  for (const u of usernames) expect(usernameProblem(u), u).toBeNull();
});
