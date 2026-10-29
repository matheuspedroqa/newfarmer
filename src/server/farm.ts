import { ANIMALS, CROPS, type AnimalId, type CropId } from "@/lib/catalog";
import type { FarmInput } from "@/lib/validation";
import type { Db } from "./db";

export interface Farm {
  animals: { id: AnimalId; count: number }[];
  crops: CropId[];
}

export function getFarm(db: Db, userId: number): Farm {
  const counts = new Map(
    (db.prepare("SELECT animal_id, count FROM farm_animals WHERE user_id = ?").all(userId) as {
      animal_id: string;
      count: number;
    }[]).map((r) => [r.animal_id, r.count]),
  );
  const crops = new Set(
    (db.prepare("SELECT crop_id FROM farm_crops WHERE user_id = ?").all(userId) as { crop_id: string }[]).map(
      (r) => r.crop_id,
    ),
  );
  return {
    animals: ANIMALS.filter((a) => counts.has(a.id)).map((a) => ({ id: a.id, count: counts.get(a.id)! })),
    crops: CROPS.filter((c) => crops.has(c.id)).map((c) => c.id),
  };
}

export function saveFarm(db: Db, userId: number, farm: FarmInput): void {
  db.transaction(() => {
    db.prepare("DELETE FROM farm_animals WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM farm_crops WHERE user_id = ?").run(userId);
    const insertAnimal = db.prepare("INSERT INTO farm_animals (user_id, animal_id, count) VALUES (?, ?, ?)");
    for (const [id, count] of Object.entries(farm.animals)) insertAnimal.run(userId, id, count);
    const insertCrop = db.prepare("INSERT OR IGNORE INTO farm_crops (user_id, crop_id) VALUES (?, ?)");
    for (const id of farm.crops) insertCrop.run(userId, id);
  })();
}
