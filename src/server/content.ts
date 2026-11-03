import "server-only";
import fs from "node:fs";
import path from "node:path";
import { CROP_IDS, type AnimalId, type CropId } from "@/lib/catalog";
import { animalContentSchema, cropContentSchema, type AnimalContent, type CropContent } from "@/lib/content-schema";

const cache = new Map<string, unknown>();

function load<T>(kind: "animals" | "crops", id: string, parse: (data: unknown) => T): T | null {
  const key = `${kind}/${id}`;
  if (!cache.has(key)) {
    const file = path.join(process.cwd(), "content", kind, `${id}.json`);
    cache.set(key, fs.existsSync(file) ? parse(JSON.parse(fs.readFileSync(file, "utf8"))) : null);
  }
  return cache.get(key) as T | null;
}

export function getAnimalContent(id: AnimalId): AnimalContent | null {
  return load("animals", id, (d) => animalContentSchema.parse(d));
}

export function getCropContent(id: CropId): CropContent | null {
  return load("crops", id, (d) => cropContentSchema.parse(d));
}

export function getAllCropContent(): CropContent[] {
  return CROP_IDS.map(getCropContent).filter((c): c is CropContent => c !== null);
}
