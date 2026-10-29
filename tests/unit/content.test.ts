import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANIMAL_IDS, CROP_IDS } from "@/lib/catalog";
import { animalContentSchema, cropContentSchema } from "@/lib/content-schema";
import { KNOWLEDGE_COUNTRIES } from "@/lib/countries";

function countriesOf(data: unknown): string[] {
  return Object.keys((data as { countryNotes?: object })?.countryNotes ?? {}).sort();
}

function read(kind: "animals" | "crops", id: string): unknown {
  const file = path.join(process.cwd(), "content", kind, `${id}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

describe.each(ANIMAL_IDS)("ficha do animal %s", (id) => {
  it("existe, é válida e o id bate com o nome do arquivo", () => {
    const data = read("animals", id);
    expect(data, `content/animals/${id}.json não existe`).not.toBeNull();
    const parsed = animalContentSchema.safeParse(data);
    expect(parsed.success ? "ok" : parsed.error.issues.slice(0, 3)).toBe("ok");
    expect((data as { id: string }).id).toBe(id);
    expect(countriesOf(data), "bloco No seu país para os 9 países").toEqual([...KNOWLEDGE_COUNTRIES].sort());
  });
});

describe.each(CROP_IDS)("ficha da plantação %s", (id) => {
  it("existe, é válida e o id bate com o nome do arquivo", () => {
    const data = read("crops", id);
    expect(data, `content/crops/${id}.json não existe`).not.toBeNull();
    const parsed = cropContentSchema.safeParse(data);
    expect(parsed.success ? "ok" : parsed.error.issues.slice(0, 3)).toBe("ok");
    expect((data as { id: string }).id).toBe(id);
    expect(countriesOf(data), "bloco No seu país para os 9 países").toEqual([...KNOWLEDGE_COUNTRIES].sort());
  });
});
