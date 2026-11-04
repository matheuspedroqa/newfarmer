import { describe, expect, it } from "vitest";
import { deleteAccount, exportUserData } from "@/server/account-data";
import { logActivity } from "@/server/activity-log";
import { addDiaryEntry } from "@/server/diary";
import { saveFarm } from "@/server/farm";
import { createSession, getSessionUser } from "@/server/sessions";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

describe("exportUserData", () => {
  it("traz a conta, a criação, o diário e o registro de atividade só da própria pessoa, sem senha nem tokens", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com", username: "bia" });
    await saveFarm(db, ana, { animals: { chickens: 12 }, crops: ["tomato"] });
    await addDiaryEntry(db, ana, { animalId: "chickens", date: "2026-11-01", kind: "other", animalName: "", note: "Nota da Ana" });
    await addDiaryEntry(db, bia, { animalId: "chickens", date: "2026-11-01", kind: "other", animalName: "", note: "Nota da Bia" });
    await logActivity(db, { userId: ana, action: "auth.login", target: "ana", ip: "1.1.1.1" });
    await logActivity(db, { userId: bia, action: "auth.login", target: "bia", ip: "2.2.2.2" });
    await createSession(db, ana);

    const data = await exportUserData(db, ana);
    expect(data.account.username).toBe("ana");
    expect(data.animals).toEqual([{ animal: "chickens", count: 12 }]);
    expect(data.crops).toEqual(["tomato"]);
    expect(data.diary.map((d) => d.note)).toEqual(["Nota da Ana"]);
    expect(data.activity.map((a) => a.ip)).toEqual(["1.1.1.1"]);
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/password|hash|token/i);
    expect(text).not.toContain("Bia");
  });
});

describe("deleteAccount", () => {
  it("com a senha certa apaga a conta e tudo dela, e encerra as sessões", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com", username: "bia" });
    await saveFarm(db, ana, { animals: { chickens: 12 }, crops: ["tomato"] });
    await addDiaryEntry(db, ana, { animalId: "chickens", date: "2026-11-01", kind: "other", animalName: "", note: "x" });
    await saveFarm(db, bia, { animals: { goats: 2 }, crops: [] });
    const token = await createSession(db, ana);

    expect(await deleteAccount(db, ana, DEFAULT_PASSWORD)).toBe("ok");
    expect(await getSessionUser(db, token)).toBeNull();
    for (const table of ["users", "farm_animals", "farm_crops", "diary_entries", "sessions"]) {
      const [{ n }] = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${table === "users" ? "id" : "user_id"} = $1`, [ana]);
      expect(n, table).toBe(0);
    }
    expect((await exportUserData(db, bia)).animals).toEqual([{ animal: "goats", count: 2 }]);
  });

  it("com a senha errada não apaga nada", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    expect(await deleteAccount(db, ana, "errada123")).toBe("wrongPassword");
    expect((await exportUserData(db, ana)).account.username).toBe("ana");
  });
});
