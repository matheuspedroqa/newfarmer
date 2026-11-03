import { describe, expect, it } from "vitest";
import { changePassword, verifyCredentials } from "@/server/accounts";
import { createSession, getSessionUser } from "@/server/sessions";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

describe("changePassword", () => {
  it("troca a senha quando a atual está certa", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    expect(await changePassword(db, id, DEFAULT_PASSWORD, "nova-senha-1")).toBe("ok");
    expect((await verifyCredentials(db, "ana@exemplo.com", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
  });

  it("recusa quando a senha atual está errada e não muda nada", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    expect(await changePassword(db, id, "errada123", "nova-senha-1")).toBe("wrongPassword");
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(true);
  });

  it("encerra as outras sessões e mantém a atual", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const current = await createSession(db, id);
    const other = await createSession(db, id);
    await changePassword(db, id, DEFAULT_PASSWORD, "nova-senha-1", current);
    expect((await getSessionUser(db, current))?.id).toBe(id);
    expect(await getSessionUser(db, other)).toBeNull();
  });
});
