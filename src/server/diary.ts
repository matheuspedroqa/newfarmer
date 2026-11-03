import "server-only";
import type { AnimalId } from "@/lib/catalog";
import type { DiaryInput } from "@/lib/validation";
import type { Db } from "./db";

export type DiaryEntry = DiaryInput & { id: number };

export async function addDiaryEntry(db: Db, userId: number, entry: DiaryInput): Promise<number> {
  const [row] = await db.query<{ id: number }>(
    `INSERT INTO diary_entries (user_id, animal_id, entry_date, kind, animal_name, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, entry.animalId, entry.date, entry.kind, entry.animalName, entry.note, Date.now()],
  );
  return row.id;
}

/** Mais nova primeiro; no mesmo dia, a última anotada primeiro. */
export function listDiary(
  db: Db,
  userId: number,
  { animalId, limit = 200 }: { animalId?: AnimalId; limit?: number },
): Promise<DiaryEntry[]> {
  return db.query<DiaryEntry>(
    `SELECT id, animal_id AS "animalId", entry_date AS date, kind, animal_name AS "animalName", note
     FROM diary_entries WHERE user_id = $1 AND ($2::text IS NULL OR animal_id = $2)
     ORDER BY entry_date DESC, id DESC LIMIT $3`,
    [userId, animalId ?? null, limit],
  );
}

export async function deleteDiaryEntry(db: Db, userId: number, entryId: number): Promise<boolean> {
  // Postgres recusa id que não é inteiro (formulário adulterado); sem isso daria erro na página.
  if (!Number.isInteger(entryId)) return false;
  return (await db.run("DELETE FROM diary_entries WHERE id = $1 AND user_id = $2", [entryId, userId])) > 0;
}
