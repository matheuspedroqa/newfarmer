import { describe, expect, it } from "vitest";
import { animalContentSchema, cropContentSchema } from "@/lib/content-schema";

const t = { pt: "texto", en: "text" };
const seasons = { summer: t, autumn: t, winter: t, spring: t };
const zones = <T,>(v: T) => ({ tropical: v, subtropical: v, temperate: v, semiarid: v, cold: v });
const sources = [
  { title: "Embrapa", url: "https://www.embrapa.br/a" },
  { title: "FAO", url: "https://www.fao.org/b" },
];

const animal = {
  id: "chickens",
  summary: t,
  breeds: [1, 2, 3].map((i) => ({ name: `Raça ${i}`, purpose: t, notes: t })),
  idealTemp: { minC: 15, maxC: 25, notes: t },
  seasonalCare: zones(seasons),
  feeding: [t, t, t],
  healthCare: [t, t, t],
  diseases: [1, 2, 3].map(() => ({ name: t, signs: t, homeCare: t, vetCare: t })),
  sources,
};

const cal = { directSowing: [], seedbed: [8], transplant: [9], harvest: [12, 1] };
const crop = { id: "tomato", summary: t, calendar: zones(cal), care: { fertilizing: t, pruning: null, watering: t, other: t }, sources };

describe("animalContentSchema", () => {
  it("aceita ficha completa", () => expect(animalContentSchema.safeParse(animal).success).toBe(true));
  it("recusa texto sem inglês", () =>
    expect(animalContentSchema.safeParse({ ...animal, summary: { pt: "x", en: "" } }).success).toBe(false));
  it("recusa menos de 2 fontes", () =>
    expect(animalContentSchema.safeParse({ ...animal, sources: [sources[0]] }).success).toBe(false));
  it("recusa id fora do catálogo", () =>
    expect(animalContentSchema.safeParse({ ...animal, id: "dragons" }).success).toBe(false));
  it("recusa temperatura mínima maior que a máxima", () =>
    expect(animalContentSchema.safeParse({ ...animal, idealTemp: { minC: 30, maxC: 10, notes: t } }).success).toBe(false));
});

describe("cropContentSchema", () => {
  it("aceita ficha completa", () => expect(cropContentSchema.safeParse(crop).success).toBe(true));
  it("recusa mês 13", () =>
    expect(cropContentSchema.safeParse({ ...crop, calendar: zones({ ...cal, harvest: [13] }) }).success).toBe(false));
  it("recusa URL inválida", () =>
    expect(cropContentSchema.safeParse({ ...crop, sources: [sources[0], { title: "x", url: "nao-e-url" }] }).success).toBe(false));
});

describe("countryNotes (bloco 'No seu país')", () => {
  const note = { highlights: [t, t], sources: [sources[0]] };

  it("aceita notas por país da base de conhecimento", () => {
    expect(animalContentSchema.safeParse({ ...animal, countryNotes: { BR: note, PT: note } }).success).toBe(true);
    expect(cropContentSchema.safeParse({ ...crop, countryNotes: { US: note } }).success).toBe(true);
  });

  it("recusa país fora da base, nota com menos de 2 destaques ou sem fonte", () => {
    expect(animalContentSchema.safeParse({ ...animal, countryNotes: { JP: note } }).success).toBe(false);
    expect(animalContentSchema.safeParse({ ...animal, countryNotes: { BR: { ...note, highlights: [t] } } }).success).toBe(false);
    expect(animalContentSchema.safeParse({ ...animal, countryNotes: { BR: { ...note, sources: [] } } }).success).toBe(false);
  });
});
