import { expect, it } from "vitest";
import { listSubscribers } from "@/server/admin";
import { verifyCredentials } from "@/server/accounts";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

it.each(["' OR '1'='1", "admin'--", "x'; DROP TABLE users; --"])("login com %j não entra nem quebra o banco", async (evil) => {
  const db = await testDb();
  await makeUser(db);
  expect((await verifyCredentials(db, evil, evil)).ok).toBe(false); // username malicioso
  expect((await verifyCredentials(db, "ana", evil)).ok).toBe(false); // username real, senha maliciosa
  expect(await db.query("SELECT COUNT(*)::int AS n FROM users")).toEqual([{ n: 1 }]);
});

it.each(["' OR '1'='1", "x'; DROP TABLE users; --", "%", "\\"])("busca de assinantes com %j não quebra o banco nem vaza contas", async (evil) => {
  const db = await testDb();
  await makeUser(db);
  expect(await listSubscribers(db, { q: evil })).toEqual([]);
  expect(await db.query("SELECT COUNT(*)::int AS n FROM users")).toEqual([{ n: 1 }]);
});
