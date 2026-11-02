import { describe, expect, it } from "vitest";
import { addDiaryEntry, deleteDiaryEntry, listDiary } from "@/server/diary";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const entry = { animalId: "cows", date: "2026-11-01", kind: "vaccine", animalName: "Mimosa", note: "Aftosa" } as const;

describe("diário dos animais", () => {
  it("guarda e lista da mais nova para a mais antiga", async () => {
    const db = testDb();
    const id = await makeUser(db);
    addDiaryEntry(db, id, entry);
    addDiaryEntry(db, id, { ...entry, date: "2026-11-02", kind: "birth", animalName: "", note: "Nasceu bezerro" });
    addDiaryEntry(db, id, { ...entry, date: "2026-10-01", note: "Antiga" });
    expect(listDiary(db, id, { animalId: "cows" }).map((e) => e.note)).toEqual(["Nasceu bezerro", "Aftosa", "Antiga"]);
    expect(listDiary(db, id, { animalId: "cows" })[1]).toMatchObject({ ...entry, id: expect.any(Number) });
  });

  it("filtra por animal e limita a quantidade (painel)", async () => {
    const db = testDb();
    const id = await makeUser(db);
    addDiaryEntry(db, id, entry);
    addDiaryEntry(db, id, { ...entry, animalId: "chickens", date: "2026-11-03" });
    expect(listDiary(db, id, { animalId: "chickens" })).toHaveLength(1);
    expect(listDiary(db, id, { limit: 1 }).map((e) => e.animalId)).toEqual(["chickens"]);
  });

  it("apaga só a anotação da própria pessoa", async () => {
    const db = testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    const anaEntry = addDiaryEntry(db, ana, entry);
    expect(deleteDiaryEntry(db, bia, anaEntry)).toBe(false);
    expect(listDiary(db, ana, {})).toHaveLength(1);
    expect(listDiary(db, bia, {})).toHaveLength(0);
    expect(deleteDiaryEntry(db, ana, anaEntry)).toBe(true);
    expect(listDiary(db, ana, {})).toHaveLength(0);
  });
});
