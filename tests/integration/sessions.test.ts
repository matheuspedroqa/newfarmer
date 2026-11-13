import { describe, expect, it } from "vitest";
import {
  SESSION_IDLE_MS,
  SESSION_REMEMBER_IDLE_MS,
  SESSION_TOUCH_MS,
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

  it("o limite de 30 dias vale mesmo para quem usou sem parar", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const token = await createSession(db, id, 0);
    const passo = 30 * 60_000;
    for (let t = passo; t < SESSION_TTL_MS; t += passo) {
      expect((await getSessionUser(db, token, t))?.id).toBe(id);
    }
    expect(await getSessionUser(db, token, SESSION_TTL_MS + 1)).toBeNull();
  });

  it("3 horas parado: a sessão acaba e é apagada", async () => {
    const db = await testDb();
    const token = await createSession(db, await makeUser(db), 0);
    expect(await getSessionUser(db, token, SESSION_IDLE_MS + 1)).toBeNull();
    expect(await db.query("SELECT COUNT(*)::int AS n FROM sessions")).toEqual([{ n: 0 }]);
  });

  it("manter conectado: aguenta 7 dias parado, não mais", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const token = await createSession(db, id, 0, true);
    expect((await getSessionUser(db, token, SESSION_REMEMBER_IDLE_MS))?.id).toBe(id);
    const other = await createSession(db, id, 0, true);
    expect(await getSessionUser(db, other, SESSION_REMEMBER_IDLE_MS + 1)).toBeNull();
  });

  it("exatamente 3 horas parado ainda vale; só acima disso acaba", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const token = await createSession(db, id, 0);
    expect((await getSessionUser(db, token, SESSION_IDLE_MS))?.id).toBe(id);
  });

  it("quem continua usando não é desconectado", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const token = await createSession(db, id, 0);
    for (let t = 50 * 60_000; t <= 5 * 60 * 60_000; t += 50 * 60_000) {
      expect((await getSessionUser(db, token, t))?.id).toBe(id);
    }
  });

  it("last_seen_at só é regravado depois de 5 minutos", async () => {
    const db = await testDb();
    const token = await createSession(db, await makeUser(db), 1000);
    const visto = async () => (await db.query<{ last_seen_at: string | number }>("SELECT last_seen_at FROM sessions"))[0].last_seen_at;
    expect(Number(await visto())).toBe(1000);
    await getSessionUser(db, token, 1000 + SESSION_TOUCH_MS - 1);
    expect(Number(await visto())).toBe(1000);
    await getSessionUser(db, token, 1000 + SESSION_TOUCH_MS + 1);
    expect(Number(await visto())).toBe(1000 + SESSION_TOUCH_MS + 1);
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
