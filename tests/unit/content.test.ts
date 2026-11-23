import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANIMAL_IDS, CROP_IDS } from "@/lib/catalog";
import { animalContentSchema, cropContentSchema, recipesSchema } from "@/lib/content-schema";
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

describe("ícones", () => {
  it("cada cultivo e cada animal tem o seu próprio ícone, sem repetir", () => {
    const ids = [...CROP_IDS, ...ANIMAL_IDS];
    const files = ids.map((id) => path.join(process.cwd(), "public", "icons", `${id}.svg`));
    expect(ids.filter((_, i) => !fs.existsSync(files[i])), "sem arquivo (rode node scripts/icons/build.mjs)").toEqual([]);
    expect(new Set(files.map((f) => fs.readFileSync(f, "utf8"))).size).toBe(ids.length);
  });
});

describe("receitas", () => {
  it("são válidas e têm 5 de frango, até 6 queijos e 5 saladas", () => {
    const parsed = recipesSchema.safeParse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "recipes.json"), "utf8")));
    expect(parsed.success ? "ok" : parsed.error.issues.slice(0, 3)).toBe("ok");
    const count = (g: string) => parsed.data!.recipes.filter((r) => r.group === g).length;
    expect(count("chicken")).toBe(5);
    expect(count("cheese")).toBeGreaterThan(0);
    expect(count("cheese")).toBeLessThanOrEqual(6);
    expect(count("salad")).toBeGreaterThanOrEqual(5);
    expect(parsed.data!.recipes.some((r) => r.id === "chicken-soup"), "canja").toBe(true);
    // Toda página de cultivo e de animal tem "Receitas com ...".
    const used = new Set(parsed.data!.recipes.flatMap((r) => r.uses));
    expect([...CROP_IDS, ...ANIMAL_IDS].filter((i) => !used.has(i))).toEqual([]);
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
