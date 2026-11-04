import "server-only";
import type { AnimalId } from "@/lib/catalog";
import type { DiaryInput } from "@/lib/validation";
import type { Db } from "./db";

export type DiaryEntry = DiaryInput & { id: number };

/** null quando a mesma etiqueta (clientId) já foi gravada: é a mesma anotação reenviada. */
export async function addDiaryEntry(db: Db, userId: number, entry: DiaryInput, clientId?: string): Promise<number | null> {
  const [row] = await db.query<{ id: number }>(
    `INSERT INTO diary_entries (user_id, animal_id, entry_date, kind, animal_name, note, created_at, client_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id, client_id) DO NOTHING RETURNING id`,
    [userId, entry.animalId, entry.date, entry.kind, entry.animalName, entry.note, Date.now(), clientId ?? null],
  );
  return row?.id ?? null;
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

/** Devolve o animal da anotação apagada (ou null se não era da conta). */
export async function deleteDiaryEntry(db: Db, userId: number, entryId: number): Promise<AnimalId | null> {
  // Postgres recusa id que não é inteiro (formulário adulterado); sem isso daria erro na página.
  if (!Number.isInteger(entryId)) return null;
  const [row] = await db.query<{ animal_id: AnimalId }>(
    "DELETE FROM diary_entries WHERE id = $1 AND user_id = $2 RETURNING animal_id",
    [entryId, userId],
  );
  return row?.animal_id ?? null;
}
