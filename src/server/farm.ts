import "server-only";
import { ANIMALS, CROPS, type AnimalId, type CropId } from "@/lib/catalog";
import type { FarmInput } from "@/lib/validation";
import type { Db } from "./db";

export interface Farm {
  animals: { id: AnimalId; count: number }[];
  crops: CropId[];
}

export async function getFarm(db: Db, userId: number): Promise<Farm> {
  const counts = new Map(
    (
      await db.query<{ animal_id: string; count: number }>(
        "SELECT animal_id, count FROM farm_animals WHERE user_id = $1",
        [userId],
      )
    ).map((r) => [r.animal_id, r.count]),
  );
  const crops = new Set(
    (await db.query<{ crop_id: string }>("SELECT crop_id FROM farm_crops WHERE user_id = $1", [userId])).map(
      (r) => r.crop_id,
    ),
  );
  return {
    animals: ANIMALS.filter((a) => counts.has(a.id)).map((a) => ({ id: a.id, count: counts.get(a.id)! })),
    crops: CROPS.filter((c) => crops.has(c.id)).map((c) => c.id),
  };
}

export async function saveFarm(db: Db, userId: number, farm: FarmInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM farm_animals WHERE user_id = $1", [userId]);
    await tx.run("DELETE FROM farm_crops WHERE user_id = $1", [userId]);
    for (const [id, count] of Object.entries(farm.animals)) {
      await tx.run("INSERT INTO farm_animals (user_id, animal_id, count) VALUES ($1, $2, $3)", [userId, id, count]);
    }
    for (const id of farm.crops) {
      await tx.run("INSERT INTO farm_crops (user_id, crop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, id]);
    }
  });
}
