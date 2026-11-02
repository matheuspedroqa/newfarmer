import type { AnimalId } from "@/lib/catalog";
import type { DiaryInput } from "@/lib/validation";
import type { Db } from "./db";

export type DiaryEntry = DiaryInput & { id: number };

export function addDiaryEntry(db: Db, userId: number, entry: DiaryInput): number {
  const result = db
    .prepare(
      "INSERT INTO diary_entries (user_id, animal_id, entry_date, kind, animal_name, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(userId, entry.animalId, entry.date, entry.kind, entry.animalName, entry.note, Date.now());
  return Number(result.lastInsertRowid);
}

/** Mais nova primeiro; no mesmo dia, a última anotada primeiro. */
export function listDiary(db: Db, userId: number, { animalId, limit = 200 }: { animalId?: AnimalId; limit?: number }): DiaryEntry[] {
  return db
    .prepare(
      `SELECT id, animal_id AS animalId, entry_date AS date, kind, animal_name AS animalName, note
       FROM diary_entries WHERE user_id = ? AND (? IS NULL OR animal_id = ?)
       ORDER BY entry_date DESC, id DESC LIMIT ?`,
    )
    .all(userId, animalId ?? null, animalId ?? null, limit) as DiaryEntry[];
}

export function deleteDiaryEntry(db: Db, userId: number, entryId: number): boolean {
  return db.prepare("DELETE FROM diary_entries WHERE id = ? AND user_id = ?").run(entryId, userId).changes > 0;
}
