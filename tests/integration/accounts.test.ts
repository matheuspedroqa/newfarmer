import { describe, expect, it } from "vitest";
import {
  EmailTakenError,
  UsernameTakenError,
  LOCK_WINDOW_MS,
  getUserById,
  setPassword,
  verifyCredentials,
} from "@/server/accounts";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

describe("createUser", () => {
  it("guarda o usuário com a senha embaralhada", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const [row] = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [id]);
    expect(row.password_hash).not.toContain(DEFAULT_PASSWORD);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(await getUserById(db, id)).toMatchObject({
      name: "Ana",
      email: "ana@exemplo.com",
      username: "ana",
      isPlatformAdmin: false,
      cityLabel: "Campinas, São Paulo, Brasil",
      climateZone: "subtropical",
      climateEstimated: false,
      hemisphere: "south",
      locale: "en",
      theme: "light",
    });
  });

  it("e-mail repetido gera EmailTakenError, mesmo com letras maiúsculas", async () => {
    const db = await testDb();
    await makeUser(db);
    await expect(makeUser(db, { email: "ANA@exemplo.com", username: "outra" })).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("username repetido (qualquer caixa) gera UsernameTakenError", async () => {
    const db = await testDb();
    await makeUser(db, { username: "ana" });
    await expect(makeUser(db, { username: "ANA", email: "outra@exemplo.com" })).rejects.toBeInstanceOf(UsernameTakenError);
  });
});

describe("verifyCredentials", () => {
  it("senha certa entra", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    expect(await verifyCredentials(db, "Ana", DEFAULT_PASSWORD)).toEqual({ ok: true, userId: id });
  });

  it("senha errada ou username desconhecido dão o mesmo resultado", async () => {
    const db = await testDb();
    await makeUser(db);
    expect(await verifyCredentials(db, "ana", "errada123")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials(db, "naoexiste", DEFAULT_PASSWORD)).toEqual({ ok: false, reason: "invalid" });
  });

  it("entra com username (qualquer caixa) e senha; e-mail não serve mais para entrar", async () => {
    const db = await testDb();
    await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
    expect((await verifyCredentials(db, "ANA", DEFAULT_PASSWORD)).ok).toBe(true);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
  });

  it("5 erros no mesmo username bloqueiam por 15 minutos, mesmo com a senha certa", async () => {
    const db = await testDb();
    await makeUser(db, { username: "ana" });
    for (let i = 0; i < 5; i++) await verifyCredentials(db, "ana", "errada", 1000 + i);
    expect(await verifyCredentials(db, "ana", DEFAULT_PASSWORD, 2000)).toEqual({ ok: false, reason: "locked" });
    const [row] = await db.query<{ identifier: string }>("SELECT identifier FROM login_attempts LIMIT 1");
    expect(row.identifier).toBe("ana");
  });

  it("texto que não pode ser username (ex.: senha digitada no campo) não grava tentativa", async () => {
    const db = await testDb();
    await makeUser(db);
    expect(await verifyCredentials(db, "Minha Senha Secreta!123", "x")).toEqual({ ok: false, reason: "invalid" });
    const [{ n }] = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_attempts");
    expect(n).toBe(0);
  });

  it("username válido mas desconhecido grava a tentativa e pode bloquear", async () => {
    const db = await testDb();
    for (let i = 0; i < 5; i++) await verifyCredentials(db, "fantasma", "errada", 1000 + i);
    const [{ n }] = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_attempts");
    expect(n).toBe(5);
    expect(await verifyCredentials(db, "fantasma", "errada", 2000)).toEqual({ ok: false, reason: "locked" });
  });

  it("5 erros seguidos bloqueiam por 15 minutos, mesmo com a senha certa", async () => {
    const db = await testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) await verifyCredentials(db, "ana", "errada", t0 + i);
    expect(await verifyCredentials(db, "ana", DEFAULT_PASSWORD, t0 + 10)).toEqual({
      ok: false,
      reason: "locked",
    });
    const later = t0 + LOCK_WINDOW_MS + 10;
    expect((await verifyCredentials(db, "ana", DEFAULT_PASSWORD, later)).ok).toBe(true);
  });

  it("um login certo zera a contagem de erros", async () => {
    const db = await testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) await verifyCredentials(db, "ana", "errada", t0 + i);
    await verifyCredentials(db, "ana", DEFAULT_PASSWORD, t0 + 5);
    for (let i = 6; i < 10; i++) await verifyCredentials(db, "ana", "errada", t0 + i);
    expect((await verifyCredentials(db, "ana", DEFAULT_PASSWORD, t0 + 11)).ok).toBe(true);
  });
});

describe("setPassword", () => {
  it("troca a senha", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await setPassword(db, id, "nova-senha-1");
    expect((await verifyCredentials(db, "ana", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana", DEFAULT_PASSWORD)).ok).toBe(false);
  });
});
