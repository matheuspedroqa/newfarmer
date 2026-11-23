import { z } from "zod";
import { ANIMAL_IDS, CROP_IDS } from "./catalog";
import { KNOWLEDGE_COUNTRIES } from "./countries";

export const textSchema = z.object({ pt: z.string().trim().min(1), en: z.string().trim().min(1), es: z.string().trim().min(1) });
export type Text = z.infer<typeof textSchema>;
const zones = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ tropical: schema, subtropical: schema, temperate: schema, semiarid: schema, cold: schema });
const sourceSchema = z.object({ title: z.string().trim().min(1), url: z.string().url() });
const months = z.array(z.number().int().min(1).max(12));

// Bloco "No seu país": o que muda em cada país da base de conhecimento (raças, regras, épocas, cuidados).
const countryNotesSchema = z
  .partialRecord(z.enum(KNOWLEDGE_COUNTRIES), z.object({ highlights: z.array(textSchema).min(2), sources: z.array(sourceSchema).min(1) }))
  .optional();

// Número-chave em destaque ("Ninhos" → "1 para cada 4–5 galinhas").
const factsSchema = (min: number) => z.array(z.object({ label: textSchema, value: textSchema })).min(min);
const tips = (min: number) => z.array(textSchema).min(min);

const guideSchema = {
  habitat: z.object({ facts: factsSchema(3), tips: tips(4) }),
  predators: z.object({ threats: z.array(z.object({ name: textSchema, signs: textSchema })).min(3), protection: tips(3) }),
  reproduction: z.object({ facts: factsSchema(4), tips: tips(4) }),
  welfare: z.object({ daily: tips(2), weekly: tips(2), monthly: tips(2), happy: tips(3), stressSigns: tips(3), handling: tips(2) }),
};

export const animalContentSchema = z.object({
  ...guideSchema,
  id: z.enum(ANIMAL_IDS),
  summary: textSchema,
  breeds: z.array(z.object({ name: z.string().trim().min(1), purpose: textSchema, notes: textSchema })).min(3),
  idealTemp: z
    .object({ minC: z.number(), maxC: z.number(), notes: textSchema })
    .refine((t) => t.minC <= t.maxC, "minC > maxC"),
  seasonalCare: zones(z.object({ summer: textSchema, autumn: textSchema, winter: textSchema, spring: textSchema })),
  feeding: z.array(textSchema).min(3),
  healthCare: z.array(textSchema).min(3),
  diseases: z
    .array(z.object({ name: textSchema, signs: textSchema, homeCare: textSchema, vetCare: textSchema }))
    .min(3),
  sources: z.array(sourceSchema).min(2),
  countryNotes: countryNotesSchema,
});
export type AnimalContent = z.infer<typeof animalContentSchema>;

const calendarSchema = z.object({
  directSowing: months,
  seedbed: months,
  transplant: months,
  harvest: months,
  notes: textSchema.optional(),
});

export const cropContentSchema = z.object({
  id: z.enum(CROP_IDS),
  summary: textSchema,
  calendar: zones(calendarSchema),
  care: z.object({ fertilizing: textSchema, pruning: textSchema.nullable(), watering: textSchema, other: textSchema }),
  sources: z.array(sourceSchema).min(2),
});
export type CropContent = z.infer<typeof cropContentSchema>;

export const RECIPE_GROUPS = ["chicken", "meat", "cheese", "salad", "vegetable", "grain", "fruit", "jam", "drink", "preserve"] as const;
export type RecipeGroup = (typeof RECIPE_GROUPS)[number];

const recipeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  group: z.enum(RECIPE_GROUPS),
  icon: z.string().trim().min(1),
  title: textSchema,
  summary: textSchema,
  serves: z.number().int().positive(),
  minutes: z.number().int().positive(),
  // Cultivos e animais usados: a receita aparece em "Receitas com ..." na página de cada um.
  uses: z.array(z.enum([...CROP_IDS, ...ANIMAL_IDS])).min(1),
  // Referências de técnica e segurança alimentar (a receita em si é escrita pela casa).
  sources: z.array(sourceSchema).min(1),
  ingredients: z.array(textSchema).min(3),
  steps: z.array(textSchema).min(3),
  tip: textSchema.optional(),
  // Aviso de segurança alimentar (leite cru, ponto da carne), mostrado em destaque.
  safety: textSchema.optional(),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const recipesSchema = z
  .object({ recipes: z.array(recipeSchema) })
  .refine((d) => new Set(d.recipes.map((r) => r.id)).size === d.recipes.length, "id de receita repetido");
