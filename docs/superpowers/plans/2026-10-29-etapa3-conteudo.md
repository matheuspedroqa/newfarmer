# NewFarmer Etapa 3 — Conteúdo, Animais, Plantações e "o que fazer este mês" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fichas pesquisadas na internet para os 6 animais e as 20 plantações (PT/EN, 5 tipos de clima, fontes citadas), abas Animais e Plantações, calendário de 12 meses ajustado ao hemisfério, e no Painel o "o que fazer este mês" e a dica da estação.

**Architecture:** O conteúdo fica em arquivos JSON (`content/animals/<id>.json`, `content/crops/<id>.json`) validados por esquemas `zod`; um teste exige que todo item do catálogo tenha ficha completa e válida (vai de vermelho a verde conforme as fichas ficam prontas). Regras puras em `src/lib/seasons.ts` (estação do mês, inversão de hemisfério, tarefas do mês). Páginas leem as fichas no servidor.

**Tech Stack:** a mesma das etapas anteriores.

## Global Constraints

- Tudo das Etapas 1 e 2 continua valendo.
- Calendários escritos na referência do **hemisfério sul**; para o norte o mês `m` vira `((m + 5) mod 12) + 1`.
- Estações (sul): verão dez–fev, outono mar–mai, inverno jun–ago, primavera set–nov. Norte: invertidas.
- Remédios: todo bloco de remédio mostra o aviso fixo "Consulte um veterinário antes de medicar". Remédio veterinário é descrito pelo princípio ativo/tipo, sem dose.
- Cada ficha tem pelo menos 2 fontes (título + URL), preferindo Embrapa, FAO, universidades, extensão rural e órgãos veterinários.
- Conteúdo entregue por partes para o usuário revisar: lote A (6 animais), lote B (hortaliças + grãos), lote C (frutas + raízes e ervas).
- Plantação que não serve para um clima: calendário com listas vazias e `notes` explicando.

## Estrutura de arquivos

```
content/animals/<id>.json          6 fichas
content/crops/<id>.json            20 fichas
src/lib/content-schema.ts          esquemas zod + tipos AnimalContent, CropContent
src/server/content.ts              getAnimalContent(id), getCropContent(id), getAllCropContent()
src/lib/seasons.ts                 toUserMonth, seasonFor, userCalendar, monthlyTasks
src/components/MonthCalendar.tsx   calendário de 12 meses
src/components/SourcesList.tsx     rodapé de fontes
src/components/VetWarning.tsx      aviso fixo dos remédios
src/app/(app)/animais/...          /animais → /animais/chickens; /animais/[id]
src/app/(app)/plantacoes/...       /plantacoes (grupos); /plantacoes/[id]
tests/unit/seasons.test.ts, tests/unit/content-schema.test.ts, tests/unit/content.test.ts, tests/e2e/content.spec.ts
```

---

### Task 0: Menu do usuário, página Perfil e inglês como idioma padrão (pedido do usuário em 2026-10-29)

**Files:**
- Modify: `src/i18n/locales.ts` (padrão `en`), `src/server/db.ts` (default da coluna `locale` = `'en'`), `src/lib/validation.ts` (`changePasswordSchema`), `src/server/accounts.ts` (`changePassword`), `src/app/(app)/layout.tsx` (menu à esquerda do "Sair"; MyFarm sai do trilho), `messages/*.json`, `playwright.config.ts` e `tests/e2e/helpers.ts` (os robôs continuam em português via cookie `nf_locale=pt`)
- Create: `src/components/UserMenu.tsx`, `src/app/(app)/perfil/page.tsx`, `src/app/(app)/perfil/PasswordForm.tsx`, `src/app/(app)/perfil/LanguageForm.tsx`, `src/app/actions/profile.ts`
- Test: `tests/unit/locales.test.ts`, `tests/integration/change-password.test.ts`, casos em `tests/unit/validation.test.ts`, `tests/e2e/profile.spec.ts`

**Comportamento:**
- Botão no cabeçalho com o nome da pessoa e "▾"; abre um menu com **MyFarm** (`/myfarm`) e **Perfil** (`/perfil`); fecha com Esc, clique fora ou ao escolher; `aria-expanded` correto. Fica à esquerda do "Sair".
- `/perfil`: mostra nome, e-mail, cidade e tipo de clima; formulário de troca de senha (senha atual, nova, confirmação — mesmas regras de senha do cadastro; senha atual errada → "Senha atual incorreta"; ao trocar, encerra as outras sessões e mantém a atual); escolha de idioma (Português / English) que salva na conta e no cookie.
- Idioma padrão: inglês quando não há cookie nem preferência salva; contas novas herdam o idioma em uso na tela de cadastro.
- `changePassword(db, userId, currentPassword, newPassword, keepSessionToken?): Promise<"ok" | "wrongPassword">`.

---

### Task 1: Regras de estação, hemisfério e tarefas do mês

**Files:**
- Create: `src/lib/seasons.ts`
- Test: `tests/unit/seasons.test.ts`

**Interfaces:**
- Consumes: `ClimateZone`, `Hemisphere` (Etapa 1); `CropId` (Etapa 2).
- Produces:
  - `type Season = "summer" | "autumn" | "winter" | "spring"`
  - `type Activity = "directSowing" | "seedbed" | "transplant" | "harvest"`; `ACTIVITIES: Activity[]` nessa ordem
  - `toUserMonth(month: number, hemisphere: Hemisphere): number`
  - `seasonFor(month: number, hemisphere: Hemisphere): Season`
  - `type CropCalendar = Record<Activity, number[]> & { notes?: { pt: string; en: string } }`
  - `userCalendar(calendar: CropCalendar, hemisphere): Record<Activity, number[]>` (meses já convertidos, ordenados)
  - `monthlyTasks(crops: { id: CropId; calendar: Record<ClimateZone, CropCalendar> }[], zone, hemisphere, month): { cropId: CropId; activities: Activity[] }[]` (omite plantações sem atividade no mês)

- [ ] **Step 1: Teste**

`tests/unit/seasons.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { monthlyTasks, seasonFor, toUserMonth, userCalendar, type CropCalendar } from "@/lib/seasons";

const empty: CropCalendar = { directSowing: [], seedbed: [], transplant: [], harvest: [] };

describe("toUserMonth", () => {
  it("hemisfério sul mantém o mês", () => {
    expect(toUserMonth(3, "south")).toBe(3);
  });
  it.each([
    [1, 7],
    [3, 9],
    [6, 12],
    [7, 1],
    [12, 6],
  ])("hemisfério norte: %i → %i", (m, expected) => {
    expect(toUserMonth(m, "north")).toBe(expected);
  });
});

describe("seasonFor", () => {
  it.each([
    [1, "south", "summer"],
    [4, "south", "autumn"],
    [7, "south", "winter"],
    [10, "south", "spring"],
    [12, "south", "summer"],
    [1, "north", "winter"],
    [4, "north", "spring"],
    [7, "north", "summer"],
    [10, "north", "autumn"],
  ] as const)("mês %i no %s → %s", (m, h, s) => {
    expect(seasonFor(m, h)).toBe(s);
  });
});

describe("userCalendar", () => {
  it("converte e ordena os meses para o hemisfério norte", () => {
    const cal: CropCalendar = { ...empty, seedbed: [8, 9], harvest: [12, 1] };
    expect(userCalendar(cal, "north")).toEqual({ directSowing: [], seedbed: [2, 3], transplant: [], harvest: [6, 7] });
    expect(userCalendar(cal, "south").harvest).toEqual([1, 12]);
  });
});

describe("monthlyTasks", () => {
  const crops = [
    {
      id: "tomato" as const,
      calendar: {
        tropical: empty,
        subtropical: { ...empty, seedbed: [8], transplant: [9, 10], harvest: [12, 1] },
        temperate: empty,
        semiarid: empty,
        cold: empty,
      },
    },
    {
      id: "lettuce" as const,
      calendar: {
        tropical: empty,
        subtropical: { ...empty, directSowing: [10], harvest: [10] },
        temperate: empty,
        semiarid: empty,
        cold: empty,
      },
    },
  ];

  it("lista as atividades do mês para o clima do usuário", () => {
    expect(monthlyTasks(crops, "subtropical", "south", 10)).toEqual([
      { cropId: "tomato", activities: ["transplant"] },
      { cropId: "lettuce", activities: ["directSowing", "harvest"] },
    ]);
  });

  it("omite plantações sem atividade e respeita o hemisfério norte", () => {
    // sementeira do tomate em agosto (sul) = fevereiro (norte)
    expect(monthlyTasks(crops, "subtropical", "north", 2)).toEqual([{ cropId: "tomato", activities: ["seedbed"] }]);
    expect(monthlyTasks(crops, "tropical", "south", 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/seasons.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`src/lib/seasons.ts`:
```ts
import type { CropId } from "./catalog";
import type { ClimateZone, Hemisphere } from "@/server/climate";

export type Season = "summer" | "autumn" | "winter" | "spring";
export type Activity = "directSowing" | "seedbed" | "transplant" | "harvest";
export const ACTIVITIES: Activity[] = ["directSowing", "seedbed", "transplant", "harvest"];

export type CropCalendar = Record<Activity, number[]> & { notes?: { pt: string; en: string } };

// Calendários são escritos na referência do hemisfério sul.
export function toUserMonth(month: number, hemisphere: Hemisphere): number {
  return hemisphere === "south" ? month : ((month + 5) % 12) + 1;
}

const SOUTH_SEASONS: Season[] = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];
const OPPOSITE: Record<Season, Season> = { summer: "winter", winter: "summer", autumn: "spring", spring: "autumn" };

export function seasonFor(month: number, hemisphere: Hemisphere): Season {
  const south = SOUTH_SEASONS[month - 1];
  return hemisphere === "south" ? south : OPPOSITE[south];
}

export function userCalendar(calendar: CropCalendar, hemisphere: Hemisphere): Record<Activity, number[]> {
  return Object.fromEntries(
    ACTIVITIES.map((a) => [a, calendar[a].map((m) => toUserMonth(m, hemisphere)).sort((x, y) => x - y)]),
  ) as Record<Activity, number[]>;
}

export function monthlyTasks(
  crops: { id: CropId; calendar: Record<ClimateZone, CropCalendar> }[],
  zone: ClimateZone,
  hemisphere: Hemisphere,
  month: number,
): { cropId: CropId; activities: Activity[] }[] {
  return crops
    .map((crop) => {
      const cal = userCalendar(crop.calendar[zone], hemisphere);
      return { cropId: crop.id, activities: ACTIVITIES.filter((a) => cal[a].includes(month)) };
    })
    .filter((task) => task.activities.length > 0);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/seasons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seasons.ts tests/unit/seasons.test.ts
git commit -m "feat: estações, inversão de hemisfério e tarefas do mês"
```

---

### Task 2: Esquema das fichas, leitura e teste de completude

**Files:**
- Create: `src/lib/content-schema.ts`, `src/server/content.ts`, `content/animals/.gitkeep`, `content/crops/.gitkeep`
- Test: `tests/unit/content-schema.test.ts`, `tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `ANIMAL_IDS`, `CROP_IDS` (Etapa 2); `CropCalendar`, `Season` (Task 1).
- Produces:
  - `textSchema` (`{ pt, en }` não vazios), `animalContentSchema`, `cropContentSchema`, tipos `AnimalContent`, `CropContent`
  - `getAnimalContent(id: AnimalId): AnimalContent | null`, `getCropContent(id: CropId): CropContent | null`, `getAllCropContent(): CropContent[]` (só as que existem) — leem `content/` a partir de `process.cwd()`, com cache em memória
  - Formato de ficha de animal:
    ```json
    {
      "id": "chickens",
      "summary": { "pt": "...", "en": "..." },
      "breeds": [{ "name": "Rhode Island Red", "purpose": { "pt": "Ovos e carne", "en": "Eggs and meat" }, "notes": { "pt": "...", "en": "..." } }],
      "idealTemp": { "minC": 15, "maxC": 25, "notes": { "pt": "...", "en": "..." } },
      "seasonalCare": { "tropical": { "summer": {"pt":"...","en":"..."}, "autumn": {...}, "winter": {...}, "spring": {...} }, "subtropical": {...}, "temperate": {...}, "semiarid": {...}, "cold": {...} },
      "feeding": [{ "pt": "...", "en": "..." }],
      "healthCare": [{ "pt": "...", "en": "..." }],
      "diseases": [{ "name": {...}, "signs": {...}, "homeCare": {...}, "vetCare": {...} }],
      "sources": [{ "title": "Embrapa — ...", "url": "https://..." }]
    }
    ```
    Mínimos: 3 raças, 3 itens de alimentação, 3 de saúde, 3 doenças, 2 fontes.
  - Formato de ficha de plantação:
    ```json
    {
      "id": "tomato",
      "summary": { "pt": "...", "en": "..." },
      "calendar": { "tropical": { "directSowing": [], "seedbed": [3,4], "transplant": [4,5], "harvest": [7,8], "notes": {"pt":"...","en":"..."} }, "subtropical": {...}, "temperate": {...}, "semiarid": {...}, "cold": {...} },
      "care": { "fertilizing": {...}, "pruning": {...} | null, "watering": {...}, "other": {...} },
      "sources": [{ "title": "...", "url": "https://..." }]
    }
    ```

- [ ] **Step 1: Testes**

`tests/unit/content-schema.test.ts` — o esquema aceita uma ficha mínima válida e recusa: falta de `en`, mês 13, menos de 2 fontes, URL inválida, `id` fora do catálogo:
```ts
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
```

`tests/unit/content.test.ts` — cada item do catálogo precisa de ficha válida (fica vermelho até os lotes A, B e C terminarem):
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/content-schema.test.ts tests/unit/content.test.ts`
Expected: FAIL — esquema não existe; e 26 fichas faltando.

- [ ] **Step 3: Implementar esquema e leitura**

`src/lib/content-schema.ts`:
```ts
import { z } from "zod";
import { ANIMAL_IDS, CROP_IDS } from "./catalog";

export const textSchema = z.object({ pt: z.string().trim().min(1), en: z.string().trim().min(1) });
const zones = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ tropical: schema, subtropical: schema, temperate: schema, semiarid: schema, cold: schema });
const sourceSchema = z.object({ title: z.string().trim().min(1), url: z.string().url() });
const months = z.array(z.number().int().min(1).max(12));

export const animalContentSchema = z.object({
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
```

`src/server/content.ts`:
```ts
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
```

Criar `content/animals/.gitkeep` e `content/crops/.gitkeep` vazios.

- [ ] **Step 4: Rodar**

Run: `npx vitest run tests/unit/content-schema.test.ts`
Expected: PASS. (`content.test.ts` continua vermelho de propósito até os lotes.)

Para `npm test` não ficar vermelho durante as Tasks 3–4, as fichas dos lotes entram antes de qualquer commit que dependa de `npm test` verde; o commit desta task usa só o arquivo de esquema.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-schema.ts src/server/content.ts content tests/unit/content-schema.test.ts tests/unit/content.test.ts
git commit -m "feat: esquema e leitura das fichas de conteúdo"
```

---

### Task 3: Lote A — fichas dos 6 animais (pesquisa)

**Files:**
- Create: `content/animals/{chickens,pigs,cows,sheep,goats,ducks}.json`

**Processo (para cada animal):**
- [ ] Pesquisar (WebSearch) em fontes confiáveis: raças comuns e propósito, faixa de temperatura de conforto térmico, manejo por estação e por tipo de clima, alimentação, cuidados preventivos (vacinação, vermifugação, instalações), 3–5 doenças comuns com sinais, cuidado caseiro de apoio (ex.: isolamento, hidratação, limpeza) e tratamento veterinário pelo tipo/princípio ativo, sem dose.
- [ ] Escrever o JSON em PT e EN no formato da Task 2, com no mínimo 2 fontes reais usadas (título + URL).
- [ ] Rodar `npx vitest run tests/unit/content.test.ts -t "animal"` — as fichas prontas passam.

- [ ] **Revisão do usuário:** mostrar um resumo do lote A em linguagem simples (raças, temperatura, um exemplo de cuidado por estação, doenças) e pedir aprovação/ajustes antes de seguir.

- [ ] **Commit:** `git commit -m "content: fichas dos 6 animais (lote A)"`

---

### Task 4: Lotes B e C — fichas das 20 plantações (pesquisa)

**Files:**
- Create: `content/crops/<id>.json` para os 20 ids do catálogo

**Processo:**
- [ ] Lote B (hortaliças + grãos, 10 fichas) e depois lote C (frutas + raízes e ervas, 10 fichas). Para cada plantação: pesquisar épocas de plantio direto, sementeira, transplante e colheita por clima (Embrapa "calendário de plantio", zoneamento agrícola, guias de extensão rural, FAO/universidades para climas temperado e frio), adubação, poda (ou `null` se não se aplica), irrigação e outros cuidados.
- [ ] Meses na referência do hemisfério sul. Plantação inadequada para um clima: listas vazias e `notes` explicando (ex.: banana em clima frio).
- [ ] Rodar `npx vitest run tests/unit/content.test.ts -t "plantação"` após cada lote.
- [ ] **Revisão do usuário** ao fim de cada lote (resumo simples: calendário de 2–3 exemplos no clima dele e os cuidados), aprovação antes do commit.

- [ ] **Commits:** `git commit -m "content: hortaliças e grãos (lote B)"` e `git commit -m "content: frutas, raízes e ervas (lote C)"`

- [ ] **Conferir:** `npm test` inteiro verde (inclui `content.test.ts` com as 26 fichas).

---

### Task 5: Abas Animais e Plantações

**Files:**
- Create: `src/components/VetWarning.tsx`, `src/components/SourcesList.tsx`, `src/components/MonthCalendar.tsx`, `src/app/(app)/animais/page.tsx`, `src/app/(app)/animais/[id]/page.tsx`, `src/app/(app)/plantacoes/page.tsx`, `src/app/(app)/plantacoes/[id]/page.tsx`
- Modify: `src/app/(app)/layout.tsx` (trilho ganha 🐔 Animais e 🌱 Plantações), `messages/pt.json`, `messages/en.json`

**Interfaces:**
- Consumes: Tasks 1–4; `User.climateZone`, `User.hemisphere`.
- Produces: rotas `/animais/[id]` e `/plantacoes/[id]` (id fora do catálogo → `notFound()`); `data-testid`: `animal-tab-<id>`, `season-card-<season>`, `current-season`, `disease`, `vet-warning`, `sources`, `crop-link-<id>`, `month-cell-<activity>-<month>`, `current-month`.

- [ ] **Step 1: Textos**

Acrescentar em `messages/pt.json` (e equivalentes em `en.json`):
```json
"nav": { "dashboard": "Painel", "myfarm": "MyFarm", "weather": "Clima", "animals": "Animais", "crops": "Plantações" },
"seasons": { "summer": "Verão", "autumn": "Outono", "winter": "Inverno", "spring": "Primavera", "current": "Estação atual" },
"activities": { "directSowing": "Plantio direto", "seedbed": "Sementeira", "transplant": "Transplante", "harvest": "Colheita" },
"months": { "1": "Jan", "2": "Fev", "3": "Mar", "4": "Abr", "5": "Mai", "6": "Jun", "7": "Jul", "8": "Ago", "9": "Set", "10": "Out", "11": "Nov", "12": "Dez" },
"animalPage": {
  "breeds": "Raças", "idealTemp": "Temperatura ideal", "tempRange": "{min} °C a {max} °C",
  "seasonalCare": "Cuidados por estação no seu clima ({zone})", "feeding": "Alimentação",
  "healthCare": "Cuidados com a saúde", "diseases": "Sinais de doença e tratamento",
  "signs": "Sinais", "homeCare": "Cuidado caseiro", "vetCare": "Tratamento veterinário", "noContent": "Ficha em preparação."
},
"cropPage": {
  "groups": "Plantações por tipo", "calendar": "Calendário no seu clima ({zone}, {hemisphere})",
  "fertilizing": "Adubação", "pruning": "Poda", "noPruning": "Não precisa de poda.", "watering": "Irrigação",
  "other": "Outros cuidados", "notSuited": "Não recomendado para o seu clima.", "noContent": "Ficha em preparação."
},
"content": { "sources": "Fontes", "vetWarning": "Consulte um veterinário antes de medicar. As informações aqui são gerais e não substituem uma consulta." }
```
`en.json`: "Animals", "Crops", "Summer/Autumn/Winter/Spring/Current season", "Direct sowing/Seedbed/Transplant/Harvest", meses "Jan…Dec", e traduções equivalentes dos blocos `animalPage`, `cropPage` e `content` (`vetWarning`: "Consult a veterinarian before giving any medication. This information is general and does not replace a consultation."). O teste de chaves iguais (Etapa 2) garante que nada falte.

- [ ] **Step 2: Componentes**

`src/components/VetWarning.tsx`:
```tsx
import { getTranslations } from "next-intl/server";

export async function VetWarning() {
  const t = await getTranslations("content");
  return (
    <p data-testid="vet-warning" role="note" className="rounded-2xl border-2 border-accent bg-soft px-4 py-3 text-sm font-semibold">
      ⚠️ {t("vetWarning")}
    </p>
  );
}
```

`src/components/SourcesList.tsx`:
```tsx
import { getTranslations } from "next-intl/server";

export async function SourcesList({ sources }: { sources: { title: string; url: string }[] }) {
  const t = await getTranslations("content");
  return (
    <footer data-testid="sources" className="border-t border-border pt-4 text-sm text-muted">
      <p className="font-semibold">{t("sources")}</p>
      <ul className="mt-1 list-disc pl-5">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{s.title}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
```

`src/components/MonthCalendar.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { ACTIVITIES, type Activity } from "@/lib/seasons";

const COLORS: Record<Activity, string> = {
  directSowing: "bg-[#9cc58a] dark:bg-[#4c7a3f]",
  seedbed: "bg-[#e8c48f] dark:bg-[#8a6a3a]",
  transplant: "bg-[#a7c7e7] dark:bg-[#3a5a7a]",
  harvest: "bg-[#c8873a] dark:bg-[#e0a35c]",
};

export async function MonthCalendar({ months, currentMonth }: { months: Record<Activity, number[]>; currentMonth: number }) {
  const t = await getTranslations();
  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-center text-xs">
      <thead>
        <tr>
          <th className="w-32" />
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <th key={m} data-testid={m === currentMonth ? "current-month" : undefined}
              className={`rounded-lg py-1 ${m === currentMonth ? "bg-primary text-primary-text" : "text-muted"}`}>
              {t(`months.${m}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ACTIVITIES.map((activity) => (
          <tr key={activity}>
            <th className="text-left text-sm font-semibold">{t(`activities.${activity}`)}</th>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const on = months[activity].includes(m);
              return (
                <td key={m} data-testid={on ? `month-cell-${activity}-${m}` : undefined}
                  aria-label={on ? `${t(`activities.${activity}`)} — ${t(`months.${m}`)}` : undefined}
                  className={`h-8 rounded-lg ${on ? COLORS[activity] : "bg-bg"}`} />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Páginas de animais**

`src/app/(app)/animais/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function AnimalsIndex() {
  redirect("/animais/chickens");
}
```

`src/app/(app)/animais/[id]/page.tsx`:
```tsx
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourcesList } from "@/components/SourcesList";
import { VetWarning } from "@/components/VetWarning";
import { resolveLocale } from "@/i18n/locales";
import { ANIMALS, ANIMAL_IDS, type AnimalId } from "@/lib/catalog";
import { seasonFor, type Season } from "@/lib/seasons";
import { getAnimalContent } from "@/server/content";
import { getCurrentUser } from "@/server/current-user";

const SEASONS: Season[] = ["summer", "autumn", "winter", "spring"];

export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(ANIMAL_IDS as string[]).includes(id)) notFound();
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getAnimalContent(id as AnimalId);
  const current = seasonFor(new Date().getMonth() + 1, user.hemisphere);
  const tx = (v: { pt: string; en: string }) => v[locale];

  return (
    <section className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label={t("nav.animals")}>
        {ANIMALS.map((a) => (
          <Link key={a.id} href={`/animais/${a.id}`} data-testid={`animal-tab-${a.id}`}
            aria-current={a.id === id ? "page" : undefined}
            className={`rounded-full px-4 py-2 ${a.id === id ? "bg-primary text-primary-text" : "bg-surface ring-1 ring-border hover:bg-soft"}`}>
            <span aria-hidden>{a.icon}</span> {t(`animals.${a.id}`)}
          </Link>
        ))}
      </nav>

      <h1 className="font-display text-4xl font-bold">{t(`animals.${id}`)}</h1>
      {!content ? (
        <p className="text-muted">{t("animalPage.noContent")}</p>
      ) : (
        <>
          <p className="max-w-3xl text-lg">{tx(content.summary)}</p>

          <div className="grid grid-cols-3 gap-6">
            <section className="col-span-2">
              <h2 className="font-display text-2xl font-bold">{t("animalPage.breeds")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {content.breeds.map((b) => (
                  <article key={b.name} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                    <p className="font-bold">{b.name}</p>
                    <p className="text-sm text-accent">{tx(b.purpose)}</p>
                    <p className="mt-1 text-sm">{tx(b.notes)}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="rounded-3xl bg-soft p-6">
              <h2 className="font-display text-2xl font-bold">{t("animalPage.idealTemp")}</h2>
              <p className="mt-2 font-display text-3xl font-bold">
                {t("animalPage.tempRange", { min: content.idealTemp.minC, max: content.idealTemp.maxC })}
              </p>
              <p className="mt-2 text-sm">{tx(content.idealTemp.notes)}</p>
            </section>
          </div>

          <section>
            <h2 className="font-display text-2xl font-bold">
              {t("animalPage.seasonalCare", { zone: t(`climate.${user.climateZone}`) })}
            </h2>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {SEASONS.map((s) => (
                <article key={s} data-testid={`season-card-${s}`}
                  className={`rounded-2xl p-4 ${s === current ? "bg-soft ring-2 ring-primary" : "bg-surface ring-1 ring-border"}`}>
                  <p className="font-bold">{t(`seasons.${s}`)}</p>
                  {s === current && <p data-testid="current-season" className="text-xs font-semibold text-primary">{t("seasons.current")}</p>}
                  <p className="mt-1 text-sm">{tx(content.seasonalCare[user.climateZone][s])}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section>
              <h2 className="font-display text-2xl font-bold">{t("animalPage.feeding")}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">{content.feeding.map((f, i) => <li key={i}>{tx(f)}</li>)}</ul>
            </section>
            <section>
              <h2 className="font-display text-2xl font-bold">{t("animalPage.healthCare")}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">{content.healthCare.map((h, i) => <li key={i}>{tx(h)}</li>)}</ul>
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-bold">{t("animalPage.diseases")}</h2>
            <VetWarning />
            {content.diseases.map((d, i) => (
              <article key={i} data-testid="disease" className="rounded-2xl bg-surface p-5 ring-1 ring-border">
                <h3 className="text-lg font-bold">{tx(d.name)}</h3>
                <dl className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div><dt className="font-semibold text-accent">{t("animalPage.signs")}</dt><dd>{tx(d.signs)}</dd></div>
                  <div><dt className="font-semibold text-accent">{t("animalPage.homeCare")}</dt><dd>{tx(d.homeCare)}</dd></div>
                  <div><dt className="font-semibold text-accent">{t("animalPage.vetCare")}</dt><dd>{tx(d.vetCare)}</dd></div>
                </dl>
              </article>
            ))}
          </section>

          <SourcesList sources={content.sources} />
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Páginas de plantações**

`src/app/(app)/plantacoes/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CROPS, CROP_GROUPS } from "@/lib/catalog";

export default async function CropsIndex() {
  const t = await getTranslations();
  return (
    <section className="space-y-8">
      <h1 className="font-display text-4xl font-bold">{t("cropPage.groups")}</h1>
      {CROP_GROUPS.map((group) => (
        <div key={group}>
          <h2 className="font-display text-2xl font-bold text-accent">{t(`cropGroups.${group}`)}</h2>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {CROPS.filter((c) => c.group === group).map((c) => (
              <Link key={c.id} href={`/plantacoes/${c.id}`} data-testid={`crop-link-${c.id}`}
                className="flex flex-col items-center rounded-3xl bg-surface p-5 ring-1 ring-border hover:bg-soft">
                <span className="text-4xl" aria-hidden>{c.icon}</span>
                <span className="mt-2 font-semibold">{t(`crops.${c.id}`)}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
```

`src/app/(app)/plantacoes/[id]/page.tsx`:
```tsx
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthCalendar } from "@/components/MonthCalendar";
import { SourcesList } from "@/components/SourcesList";
import { resolveLocale } from "@/i18n/locales";
import { CROPS, CROP_IDS, type CropId } from "@/lib/catalog";
import { ACTIVITIES, userCalendar } from "@/lib/seasons";
import { getCropContent } from "@/server/content";
import { getCurrentUser } from "@/server/current-user";

export default async function CropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(CROP_IDS as string[]).includes(id)) notFound();
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const content = getCropContent(id as CropId);
  const crop = CROPS.find((c) => c.id === id)!;
  const tx = (v: { pt: string; en: string }) => v[locale];

  if (!content) {
    return (
      <section className="space-y-4">
        <Link href="/plantacoes" className="text-sm text-primary hover:underline">← {t("cropPage.groups")}</Link>
        <h1 className="font-display text-4xl font-bold">{crop.icon} {t(`crops.${id}`)}</h1>
        <p className="text-muted">{t("cropPage.noContent")}</p>
      </section>
    );
  }

  const zoneCal = content.calendar[user.climateZone];
  const months = userCalendar(zoneCal, user.hemisphere);
  const suited = ACTIVITIES.some((a) => months[a].length > 0);

  return (
    <section className="space-y-8">
      <Link href="/plantacoes" className="text-sm text-primary hover:underline">← {t("cropPage.groups")}</Link>
      <h1 className="font-display text-4xl font-bold"><span aria-hidden>{crop.icon}</span> {t(`crops.${id}`)}</h1>
      <p className="max-w-3xl text-lg">{tx(content.summary)}</p>

      <section className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">
          {t("cropPage.calendar", { zone: t(`climate.${user.climateZone}`), hemisphere: t(`climate.${user.hemisphere}`) })}
        </h2>
        {suited ? (
          <div className="mt-4"><MonthCalendar months={months} currentMonth={new Date().getMonth() + 1} /></div>
        ) : (
          <p className="mt-3 font-semibold text-accent">{t("cropPage.notSuited")}</p>
        )}
        {zoneCal.notes && <p className="mt-3 text-sm text-muted">{tx(zoneCal.notes)}</p>}
      </section>

      <div className="grid grid-cols-2 gap-4">
        {(["fertilizing", "watering", "other"] as const).map((k) => (
          <section key={k} className="rounded-2xl bg-soft p-5">
            <h2 className="font-display text-xl font-bold">{t(`cropPage.${k}`)}</h2>
            <p className="mt-1">{tx(content.care[k])}</p>
          </section>
        ))}
        <section className="rounded-2xl bg-soft p-5">
          <h2 className="font-display text-xl font-bold">{t("cropPage.pruning")}</h2>
          <p className="mt-1">{content.care.pruning ? tx(content.care.pruning) : t("cropPage.noPruning")}</p>
        </section>
      </div>

      <SourcesList sources={content.sources} />
    </section>
  );
}
```

Em `src/app/(app)/layout.tsx`, o array `nav` passa a ser:
```tsx
  const nav = [
    { href: "/painel", icon: "📊", label: t("nav.dashboard") },
    { href: "/animais", icon: "🐔", label: t("nav.animals") },
    { href: "/plantacoes", icon: "🌱", label: t("nav.crops") },
    { href: "/clima", icon: "☀️", label: t("nav.weather") },
    { href: "/myfarm", icon: "🏡", label: t("nav.myfarm") },
  ];
```

- [ ] **Step 5: Conferir build e testes**

Run: `rm -rf .next && npm run build && npm test`
Expected: sem erros; testes PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: abas Animais e Plantações com calendário por clima e hemisfério"
```

---

### Task 6: Painel — "o que fazer este mês" e dica da estação

**Files:**
- Modify: `src/app/(app)/painel/page.tsx`, `messages/pt.json`, `messages/en.json`

**Interfaces:**
- Consumes: `monthlyTasks`, `seasonFor` (Task 1); `getAllCropContent`, `getAnimalContent` (Task 2); `getFarm` (Etapa 2).
- Produces: `data-testid`: `monthly-tasks` (com um item por plantação do usuário que tem atividade no mês), `season-tip`.

- [ ] **Step 1: Textos**

Em `dashboard` (pt): trocar `cropsSoon` por
```json
"thisMonth": "Este mês nas suas plantações",
"nothingThisMonth": "Nenhuma das suas plantações tem plantio ou colheita este mês.",
"seasonTip": "Dica da estação ({season})",
"seasonTipEmpty": "Marque seus animais no MyFarm para receber dicas da estação."
```
(en: "This month in your crops", "None of your crops has planting or harvest this month.", "Seasonal tip ({season})", "Add your animals in MyFarm to get seasonal tips.")

- [ ] **Step 2: Painel**

Em `src/app/(app)/painel/page.tsx`:
- calcular `const month = new Date().getMonth() + 1;` e `const season = seasonFor(month, user.hemisphere);`
- `const tasks = monthlyTasks(getAllCropContent().filter((c) => farm.crops.includes(c.id)), user.climateZone, user.hemisphere, month);`
- trocar a seção `crop-chips` para mostrar, quando há plantações: os chips de sempre e, abaixo, o bloco `data-testid="monthly-tasks"` com título `dashboard.thisMonth` e uma linha por tarefa: `<ícone> <b>Nome</b> · Atividade, Atividade` (nomes de `activities.*`), ou `dashboard.nothingThisMonth` se `tasks` estiver vazio;
- acrescentar, depois da seção de plantações, um bloco `col-span-4` `data-testid="season-tip"` (fundo `bg-primary text-primary-text`) com título `dashboard.seasonTip` (`season` = `t(\`seasons.${season}\`)`) e, para até 3 animais do usuário que tenham ficha, `<ícone> <b>Nome</b>: texto de content.seasonalCare[user.climateZone][season]`; sem animais, `dashboard.seasonTipEmpty`.

- [ ] **Step 3: Conferir**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: painel mostra o que fazer este mês e a dica da estação"
```

---

### Task 7: Robô de ponta a ponta da Etapa 3

**Files:**
- Create: `tests/e2e/content.spec.ts`
- Modify: `tests/e2e/farm.spec.ts` (o texto "Em breve" sai; o Painel mostra `monthly-tasks`)

- [ ] **Step 1: Testes**

`tests/e2e/content.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
import { createAccount, signup, uniqueEmail } from "./helpers";

test("aba Animais mostra as 6 abas e a ficha completa com aviso de veterinário", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Animais", exact: true }).click();
  await expect(page).toHaveURL(/\/animais\/chickens$/);
  for (const id of ["chickens", "pigs", "cows", "sheep", "goats", "ducks"]) {
    await expect(page.getByTestId(`animal-tab-${id}`)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Raças" })).toBeVisible();
  await expect(page.getByTestId("current-season")).toHaveCount(1);
  await expect(page.getByTestId("disease").first()).toBeVisible();
  await expect(page.getByTestId("vet-warning")).toContainText("Consulte um veterinário");
  await expect(page.getByTestId("sources").getByRole("link").first()).toBeVisible();

  await page.getByTestId("animal-tab-goats").click();
  await expect(page.getByRole("heading", { name: "Cabras", level: 1 })).toBeVisible();
});

test("ficha de plantação mostra calendário no clima e hemisfério do usuário", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Plantações", exact: true }).click();
  await page.getByTestId("crop-link-tomato").click();
  await expect(page.getByText("Calendário no seu clima (Subtropical, Hemisfério sul)")).toBeVisible();
  await expect(page.getByTestId("current-month")).toHaveCount(1);
  await expect(page.locator('[data-testid^="month-cell-"]').first()).toBeVisible();
  await expect(page.getByTestId("sources")).toBeVisible();
});

test("hemisfério norte desloca o calendário em 6 meses", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/plantacoes/tomato");
  const south = await page.locator('[data-testid^="month-cell-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));

  await page.goto("/myfarm");
  await page.getByTestId("city-input").fill("Lisboa");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Trocar cidade" }).click();
  await expect(page.getByText("Cidade atualizada.", { exact: false }).first()).toBeVisible();

  await page.goto("/plantacoes/tomato");
  await expect(page.getByText("Hemisfério norte")).toBeVisible();
  const north = await page.locator('[data-testid^="month-cell-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  const shift = (id: string) => id.replace(/-(\d+)$/, (_, m) => `-${((Number(m) + 5) % 12) + 1}`);
  expect(new Set(north)).toEqual(new Set(south.map((s) => shift(s!))));
});

test("painel mostra o que fazer este mês e a dica da estação", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("10");
  for (const crop of ["Alface", "Tomate", "Milho", "Feijão", "Cebola", "Cenoura"]) await page.getByLabel(crop).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByTestId("monthly-tasks")).toBeVisible();
  await expect(page.getByTestId("season-tip")).toContainText("Galinhas");
});

test("animal ou plantação inexistente mostra página não encontrada", async ({ page }) => {
  await signup(page, uniqueEmail());
  const animal = await page.goto("/animais/dragons");
  expect(animal?.status()).toBe(404);
  const crop = await page.goto("/plantacoes/pizza");
  expect(crop?.status()).toBe(404);
});
```

Em `tests/e2e/farm.spec.ts`, nada depende de "Em breve"; conferir que continua verde.

- [ ] **Step 2: Rodar**

Garantir que não há outro `next dev` rodando na pasta (portas 3000/3001) antes — eles disputam a pasta `.next` com o servidor do robô.

Run: `npm run test:e2e`
Expected: PASS em todos os arquivos.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e
git commit -m "test: robô de ponta a ponta da etapa 3"
```

---

## Fim da Etapa 3 (e do MVP)

- [ ] `npm test`, `npm run test:e2e`, `npm run test:live`, `npx tsc --noEmit` e `npm run build` passam.
- [ ] Revisão final com a skill `mp-code-review` contra a spec: listar o que foi pedido e, ao lado, se foi feito.
- [ ] Mostrar ao usuário o MVP completo.
