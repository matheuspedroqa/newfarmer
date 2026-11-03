import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  createSession,
  deleteSession,
  deleteUserSessions,
  getSessionUser,
} from "@/server/sessions";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("sessões", () => {
  it("cria uma sessão e encontra o usuário pelo token", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const token = await createSession(db, id, 0);
    expect((await getSessionUser(db, token, 1))?.id).toBe(id);
  });

  it("não guarda o token em texto no banco", async () => {
    const db = await testDb();
    const token = await createSession(db, await makeUser(db));
    const [row] = await db.query<{ token_hash: string }>("SELECT token_hash FROM sessions");
    expect(row.token_hash).not.toBe(token);
  });

  it("sessão vencida não vale e é apagada", async () => {
    const db = await testDb();
    const token = await createSession(db, await makeUser(db), 0);
    expect(await getSessionUser(db, token, SESSION_TTL_MS + 1)).toBeNull();
    expect(await db.query("SELECT COUNT(*)::int AS n FROM sessions")).toEqual([{ n: 0 }]);
  });

  it("token desconhecido ou vazio não vale", async () => {
    const db = await testDb();
    expect(await getSessionUser(db, "inventado")).toBeNull();
    expect(await getSessionUser(db, "")).toBeNull();
  });

  it("sair apaga a sessão", async () => {
    const db = await testDb();
    const token = await createSession(db, await makeUser(db));
    await deleteSession(db, token);
    expect(await getSessionUser(db, token)).toBeNull();
  });

  it("deleteUserSessions apaga todas as sessões do usuário", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const a = await createSession(db, id);
    const b = await createSession(db, id);
    await deleteUserSessions(db, id);
    expect(await getSessionUser(db, a)).toBeNull();
    expect(await getSessionUser(db, b)).toBeNull();
  });
});
