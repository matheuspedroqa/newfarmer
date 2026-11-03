import { expect, it } from "vitest";
import { verifyCredentials } from "@/server/accounts";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

it.each(["' OR '1'='1", "admin'--", "x'; DROP TABLE users; --"])("login com %j não entra nem quebra o banco", async (evil) => {
  const db = await testDb();
  await makeUser(db);
  expect((await verifyCredentials(db, evil, evil)).ok).toBe(false);
  expect(await db.query("SELECT COUNT(*)::int AS n FROM users")).toEqual([{ n: 1 }]);
});
