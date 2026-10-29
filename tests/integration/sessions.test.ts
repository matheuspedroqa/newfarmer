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
    const db = testDb();
    const id = await makeUser(db);
    const token = createSession(db, id, 0);
    expect(getSessionUser(db, token, 1)?.id).toBe(id);
  });

  it("não guarda o token em texto no banco", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db));
    const row = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(row.token_hash).not.toBe(token);
  });

  it("sessão vencida não vale e é apagada", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db), 0);
    expect(getSessionUser(db, token, SESSION_TTL_MS + 1)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("token desconhecido ou vazio não vale", () => {
    const db = testDb();
    expect(getSessionUser(db, "inventado")).toBeNull();
    expect(getSessionUser(db, "")).toBeNull();
  });

  it("sair apaga a sessão", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db));
    deleteSession(db, token);
    expect(getSessionUser(db, token)).toBeNull();
  });

  it("deleteUserSessions apaga todas as sessões do usuário", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const a = createSession(db, id);
    const b = createSession(db, id);
    deleteUserSessions(db, id);
    expect(getSessionUser(db, a)).toBeNull();
    expect(getSessionUser(db, b)).toBeNull();
  });
});
