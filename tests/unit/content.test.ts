import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANIMAL_IDS, CROP_IDS } from "@/lib/catalog";
import { animalContentSchema, cropContentSchema } from "@/lib/content-schema";

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
  });
});

describe.each(CROP_IDS)("ficha da plantação %s", (id) => {
  it("existe, é válida e o id bate com o nome do arquivo", () => {
    const data = read("crops", id);
    expect(data, `content/crops/${id}.json não existe`).not.toBeNull();
    const parsed = cropContentSchema.safeParse(data);
    expect(parsed.success ? "ok" : parsed.error.issues.slice(0, 3)).toBe("ok");
    expect((data as { id: string }).id).toBe(id);
  });
});
