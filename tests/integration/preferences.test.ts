import { describe, expect, it } from "vitest";
import { getUserById } from "@/server/accounts";
import { setPreferences } from "@/server/preferences";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("setPreferences", () => {
  it("salva idioma e tema na conta", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await setPreferences(db, id, { locale: "en", theme: "dark" });
    expect(await getUserById(db, id)).toMatchObject({ locale: "en", theme: "dark" });
  });

  it("muda só o que foi pedido", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await setPreferences(db, id, { theme: "dark" });
    expect(await getUserById(db, id)).toMatchObject({ locale: "en", theme: "dark" });
  });
});
