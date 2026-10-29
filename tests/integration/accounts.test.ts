import { describe, expect, it } from "vitest";
import {
  EmailTakenError,
  LOCK_WINDOW_MS,
  getUserById,
  setPassword,
  verifyCredentials,
} from "@/server/accounts";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

describe("createUser", () => {
  it("guarda o usuário com a senha embaralhada", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as { password_hash: string };
    expect(row.password_hash).not.toContain(DEFAULT_PASSWORD);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(getUserById(db, id)).toMatchObject({
      name: "Ana",
      email: "ana@exemplo.com",
      cityLabel: "Campinas, São Paulo, Brasil",
      climateZone: "subtropical",
      climateEstimated: false,
      hemisphere: "south",
      locale: "en",
      theme: "light",
    });
  });

  it("e-mail repetido gera EmailTakenError, mesmo com letras maiúsculas", async () => {
    const db = testDb();
    await makeUser(db);
    await expect(makeUser(db, { email: "ANA@exemplo.com" })).rejects.toBeInstanceOf(EmailTakenError);
  });
});

describe("verifyCredentials", () => {
  it("senha certa entra", async () => {
    const db = testDb();
    const id = await makeUser(db);
    expect(await verifyCredentials(db, "Ana@Exemplo.com", DEFAULT_PASSWORD)).toEqual({ ok: true, userId: id });
  });

  it("senha errada ou e-mail desconhecido dão o mesmo resultado", async () => {
    const db = testDb();
    await makeUser(db);
    expect(await verifyCredentials(db, "ana@exemplo.com", "errada123")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials(db, "nao@existe.com", DEFAULT_PASSWORD)).toEqual({ ok: false, reason: "invalid" });
  });

  it("5 erros seguidos bloqueiam por 15 minutos, mesmo com a senha certa", async () => {
    const db = testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    expect(await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 10)).toEqual({
      ok: false,
      reason: "locked",
    });
    const later = t0 + LOCK_WINDOW_MS + 10;
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, later)).ok).toBe(true);
  });

  it("um login certo zera a contagem de erros", async () => {
    const db = testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 5);
    for (let i = 6; i < 10; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 11)).ok).toBe(true);
  });
});

describe("setPassword", () => {
  it("troca a senha", async () => {
    const db = testDb();
    const id = await makeUser(db);
    await setPassword(db, id, "nova-senha-1");
    expect((await verifyCredentials(db, "ana@exemplo.com", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
  });
});
