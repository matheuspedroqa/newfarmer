# NewFarmer Etapa 2 — Minha fazenda e clima Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois do cadastro a pessoa informa seus animais (com quantidade) e plantações; pode editar tudo e trocar a cidade no menu MyFarm; vê a previsão real de 5 dias na aba Clima; o Painel mostra clima, animais e plantações no visual da variante D.

**Architecture:** Mesmo padrão da Etapa 1: regras em `src/server/*` e `src/lib/*` testadas com SQLite em memória e provedor de clima falso; páginas e server actions finas. Um catálogo fixo (`src/lib/catalog.ts`) define os 6 animais e as 20 plantações; os nomes vêm de `messages/*.json`. A previsão passa por um cache de 1 hora no banco.

**Tech Stack:** o mesmo da Etapa 1 (Next.js 15, next-intl, better-sqlite3, zod 3, Vitest, Playwright, Open-Meteo).

## Global Constraints

- Tudo o que vale na Etapa 1 continua valendo (textos PT/EN, visual da variante D, cookies, tempos em ms).
- Quantidade de animais: inteiro de 1 a 100000.
- Cache da previsão: 1 hora, chave = latitude e longitude arredondadas a 2 casas (`"-25.43,-49.27"`).
- Se a previsão falhar: mostra a guardada com o horário, ou "Previsão indisponível agora"; o resto da página funciona.
- IDs fixos no código (inglês): animais `chickens, pigs, cows, sheep, goats, ducks`; plantações conforme `catalog.ts`; grupos `vegetables, grains, fruits, rootsHerbs`.
- Rota da etapa 2 do cadastro: `/boas-vindas` (exige login). O cadastro (etapa 1) passa a redirecionar para ela.
- "O que fazer este mês" e a dica da estação ficam para a Etapa 3; nesta etapa o Painel mostra as plantações escolhidas com o aviso "Em breve".

---

### Task 1: Catálogo de animais e plantações + nomes PT/EN

**Files:**
- Create: `src/lib/catalog.ts`
- Modify: `messages/pt.json`, `messages/en.json`
- Test: `tests/unit/catalog.test.ts`

**Interfaces:**
- Produces: `ANIMALS`, `type AnimalId`, `ANIMAL_IDS`, `CROP_GROUPS`, `type CropGroup`, `CROPS`, `type CropId`, `CROP_IDS`. Mensagens `animals.<id>`, `crops.<id>`, `cropGroups.<group>`, e os blocos `farm`, `myfarm`, `weather`, `nav`, `dashboard`, `errors` (novos itens) usados nas tasks seguintes.

- [ ] **Step 1: Teste**

`tests/unit/catalog.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { ANIMALS, CROPS, CROP_GROUPS } from "@/lib/catalog";

describe("catálogo", () => {
  it("tem os 6 animais pedidos", () => {
    expect(ANIMALS.map((a) => a.id)).toEqual(["chickens", "pigs", "cows", "sheep", "goats", "ducks"]);
  });

  it("tem 20 plantações, 5 em cada grupo, sem repetição", () => {
    expect(CROPS).toHaveLength(20);
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(20);
    for (const group of CROP_GROUPS) expect(CROPS.filter((c) => c.group === group)).toHaveLength(5);
  });

  it.each([
    ["pt", pt],
    ["en", en],
  ])("todo item tem nome em %s", (_lang, messages) => {
    for (const a of ANIMALS) expect(messages.animals[a.id], a.id).toBeTruthy();
    for (const c of CROPS) expect(messages.crops[c.id], c.id).toBeTruthy();
    for (const g of CROP_GROUPS) expect(messages.cropGroups[g], g).toBeTruthy();
  });

  it("pt e en têm exatamente as mesmas chaves", () => {
    const keys = (obj: object, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(keys(en).sort()).toEqual(keys(pt).sort());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/catalog.test.ts`
Expected: FAIL — `@/lib/catalog` não existe.

- [ ] **Step 3: Implementar o catálogo**

`src/lib/catalog.ts`:
```ts
export const ANIMALS = [
  { id: "chickens", icon: "🐔" },
  { id: "pigs", icon: "🐖" },
  { id: "cows", icon: "🐄" },
  { id: "sheep", icon: "🐑" },
  { id: "goats", icon: "🐐" },
  { id: "ducks", icon: "🦆" },
] as const;
export type AnimalId = (typeof ANIMALS)[number]["id"];
export const ANIMAL_IDS = ANIMALS.map((a) => a.id) as [AnimalId, ...AnimalId[]];

export const CROP_GROUPS = ["vegetables", "grains", "fruits", "rootsHerbs"] as const;
export type CropGroup = (typeof CROP_GROUPS)[number];

export const CROPS = [
  { id: "lettuce", group: "vegetables", icon: "🥬" },
  { id: "tomato", group: "vegetables", icon: "🍅" },
  { id: "kale", group: "vegetables", icon: "🥦" },
  { id: "carrot", group: "vegetables", icon: "🥕" },
  { id: "onion", group: "vegetables", icon: "🧅" },
  { id: "corn", group: "grains", icon: "🌽" },
  { id: "beans", group: "grains", icon: "🫘" },
  { id: "rice", group: "grains", icon: "🍚" },
  { id: "wheat", group: "grains", icon: "🌾" },
  { id: "soy", group: "grains", icon: "🫛" },
  { id: "banana", group: "fruits", icon: "🍌" },
  { id: "orange", group: "fruits", icon: "🍊" },
  { id: "passionFruit", group: "fruits", icon: "🟣" },
  { id: "strawberry", group: "fruits", icon: "🍓" },
  { id: "papaya", group: "fruits", icon: "🥭" },
  { id: "cassava", group: "rootsHerbs", icon: "🍠" },
  { id: "potato", group: "rootsHerbs", icon: "🥔" },
  { id: "sweetPotato", group: "rootsHerbs", icon: "🍠" },
  { id: "parsley", group: "rootsHerbs", icon: "🌿" },
  { id: "basil", group: "rootsHerbs", icon: "🌱" },
] as const satisfies readonly { id: string; group: CropGroup; icon: string }[];
export type CropId = (typeof CROPS)[number]["id"];
export const CROP_IDS = CROPS.map((c) => c.id) as [CropId, ...CropId[]];
```

- [ ] **Step 4: Acrescentar os textos**

Em `messages/pt.json`, trocar `nav` e `dashboard` e acrescentar os blocos novos (o resto fica igual):
```json
"nav": { "dashboard": "Painel", "myfarm": "MyFarm", "weather": "Clima" },
"dashboard": {
  "hello": "Olá, {name}!",
  "myAnimals": "Meus animais",
  "addAnimal": "Adicionar animal",
  "noAnimals": "Você ainda não marcou animais.",
  "myCrops": "Minhas plantações",
  "noCrops": "Você ainda não marcou plantações.",
  "editFarm": "Editar no MyFarm",
  "cropsSoon": "Em breve: o que fazer este mês em cada plantação."
},
"animals": { "chickens": "Galinhas", "pigs": "Porcos", "cows": "Vacas", "sheep": "Ovelhas", "goats": "Cabras", "ducks": "Patos" },
"crops": {
  "lettuce": "Alface", "tomato": "Tomate", "kale": "Couve", "carrot": "Cenoura", "onion": "Cebola",
  "corn": "Milho", "beans": "Feijão", "rice": "Arroz", "wheat": "Trigo", "soy": "Soja",
  "banana": "Banana", "orange": "Laranja", "passionFruit": "Maracujá", "strawberry": "Morango", "papaya": "Mamão",
  "cassava": "Mandioca", "potato": "Batata", "sweetPotato": "Batata-doce", "parsley": "Salsinha", "basil": "Manjericão"
},
"cropGroups": { "vegetables": "Hortaliças", "grains": "Grãos", "fruits": "Frutas", "rootsHerbs": "Raízes e ervas" },
"farm": {
  "step": "Etapa 2 de 2",
  "title": "Minha fazenda",
  "help": "Conte o que você tem. Dá para mudar depois no menu MyFarm.",
  "animalsTitle": "Animais",
  "animalsHelp": "Marque os animais que você tem e diga quantos.",
  "howMany": "Quantos?",
  "cropsTitle": "Plantações",
  "cropsHelp": "Marque o que você planta.",
  "save": "Salvar",
  "saved": "Salvo!",
  "continue": "Continuar",
  "skip": "Pular por enquanto"
},
"myfarm": {
  "title": "MyFarm",
  "cityTitle": "Minha cidade",
  "currentCity": "Cidade atual",
  "saveCity": "Trocar cidade",
  "cityChanged": "Cidade atualizada. O clima e os calendários já seguem a nova cidade."
},
"weather": {
  "title": "Clima",
  "now": "Agora",
  "next5": "Próximos 5 dias",
  "rainChance": "Chuva",
  "max": "Máx",
  "min": "Mín",
  "seeAll": "Ver previsão completa",
  "updatedAt": "Previsão guardada às {time} — o serviço de clima não respondeu agora.",
  "unavailable": "Previsão indisponível agora. Tente de novo mais tarde.",
  "clear": "Céu limpo",
  "partlyCloudy": "Parcialmente nublado",
  "cloudy": "Nublado",
  "fog": "Neblina",
  "drizzle": "Garoa",
  "rain": "Chuva",
  "snow": "Neve",
  "showers": "Pancadas de chuva",
  "thunder": "Tempestade"
}
```
e em `errors` acrescentar:
```json
"countInvalid": "Use um número inteiro",
"countTooSmall": "Informe pelo menos 1",
"countTooLarge": "No máximo 100.000"
```

Em `messages/en.json`, as mesmas chaves:
```json
"nav": { "dashboard": "Dashboard", "myfarm": "MyFarm", "weather": "Weather" },
"dashboard": {
  "hello": "Hello, {name}!",
  "myAnimals": "My animals",
  "addAnimal": "Add animal",
  "noAnimals": "You have not added any animals yet.",
  "myCrops": "My crops",
  "noCrops": "You have not added any crops yet.",
  "editFarm": "Edit in MyFarm",
  "cropsSoon": "Coming soon: what to do this month for each crop."
},
"animals": { "chickens": "Chickens", "pigs": "Pigs", "cows": "Cows", "sheep": "Sheep", "goats": "Goats", "ducks": "Ducks" },
"crops": {
  "lettuce": "Lettuce", "tomato": "Tomato", "kale": "Kale", "carrot": "Carrot", "onion": "Onion",
  "corn": "Corn", "beans": "Beans", "rice": "Rice", "wheat": "Wheat", "soy": "Soybean",
  "banana": "Banana", "orange": "Orange", "passionFruit": "Passion fruit", "strawberry": "Strawberry", "papaya": "Papaya",
  "cassava": "Cassava", "potato": "Potato", "sweetPotato": "Sweet potato", "parsley": "Parsley", "basil": "Basil"
},
"cropGroups": { "vegetables": "Vegetables", "grains": "Grains", "fruits": "Fruits", "rootsHerbs": "Roots and herbs" },
"farm": {
  "step": "Step 2 of 2",
  "title": "My farm",
  "help": "Tell us what you have. You can change it later in the MyFarm menu.",
  "animalsTitle": "Animals",
  "animalsHelp": "Check the animals you have and say how many.",
  "howMany": "How many?",
  "cropsTitle": "Crops",
  "cropsHelp": "Check what you grow.",
  "save": "Save",
  "saved": "Saved!",
  "continue": "Continue",
  "skip": "Skip for now"
},
"myfarm": {
  "title": "MyFarm",
  "cityTitle": "My city",
  "currentCity": "Current city",
  "saveCity": "Change city",
  "cityChanged": "City updated. Weather and calendars now follow the new city."
},
"weather": {
  "title": "Weather",
  "now": "Now",
  "next5": "Next 5 days",
  "rainChance": "Rain",
  "max": "High",
  "min": "Low",
  "seeAll": "See full forecast",
  "updatedAt": "Forecast saved at {time} — the weather service did not respond right now.",
  "unavailable": "Forecast unavailable right now. Please try again later.",
  "clear": "Clear sky",
  "partlyCloudy": "Partly cloudy",
  "cloudy": "Cloudy",
  "fog": "Fog",
  "drizzle": "Drizzle",
  "rain": "Rain",
  "snow": "Snow",
  "showers": "Rain showers",
  "thunder": "Thunderstorm"
}
```
e em `errors`:
```json
"countInvalid": "Use a whole number",
"countTooSmall": "Enter at least 1",
"countTooLarge": "At most 100,000"
```

A chave `dashboard.comingSoon` sai dos dois arquivos (o Painel novo não usa).

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/catalog.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog.ts messages tests/unit/catalog.test.ts
git commit -m "feat: catálogo de animais e plantações com nomes PT/EN"
```

---

### Task 2: Validação do formulário da fazenda

**Files:**
- Modify: `src/lib/validation.ts`, `src/app/actions/auth.ts` (usa `parseCityField`)
- Test: `tests/unit/farm-validation.test.ts`

**Interfaces:**
- Consumes: `ANIMAL_IDS`, `CROP_IDS` (Task 1).
- Produces: `MAX_ANIMAL_COUNT = 100000`; `farmSchema`; `type FarmInput = { animals: Partial<Record<AnimalId, number>>; crops: CropId[] }`; `parseFarmForm(formData: FormData): { animals: Record<string, string>; crops: string[] }` (campos `animal:<id>` = "on", `count:<id>`, `crop` repetido); `parseCityField(raw: FormDataEntryValue | null): unknown`. `toFieldErrors` passa a usar o caminho completo (`"animals.goats"`); campos simples continuam iguais (`"email"`).

- [ ] **Step 1: Teste**

`tests/unit/farm-validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { farmSchema, parseCityField, parseFarmForm, toFieldErrors } from "@/lib/validation";

function errorsOf(data: unknown) {
  const r = farmSchema.safeParse(data);
  return r.success ? {} : toFieldErrors(r.error);
}

describe("farmSchema", () => {
  it("aceita animais com quantidade e plantações do catálogo", () => {
    expect(farmSchema.parse({ animals: { chickens: "12", goats: "3" }, crops: ["tomato"] })).toEqual({
      animals: { chickens: 12, goats: 3 },
      crops: ["tomato"],
    });
  });

  it("aceita fazenda vazia", () => {
    expect(farmSchema.parse({ animals: {}, crops: [] })).toEqual({ animals: {}, crops: [] });
  });

  it.each([
    ["abc", "countInvalid"],
    ["2.5", "countInvalid"],
    ["", "countTooSmall"],
    ["0", "countTooSmall"],
    ["-3", "countTooSmall"],
    ["100001", "countTooLarge"],
  ])("quantidade %j → %s, apontando o animal", (count, code) => {
    expect(errorsOf({ animals: { goats: count }, crops: [] })["animals.goats"]).toBe(code);
  });

  it("recusa animal ou plantação fora do catálogo", () => {
    expect(farmSchema.safeParse({ animals: { dragons: "1" }, crops: [] }).success).toBe(false);
    expect(farmSchema.safeParse({ animals: {}, crops: ["pizza"] }).success).toBe(false);
  });
});

describe("parseFarmForm", () => {
  it("lê só os animais marcados e todas as plantações marcadas", () => {
    const form = new FormData();
    form.set("animal:chickens", "on");
    form.set("count:chickens", "12");
    form.set("count:pigs", "5"); // porco sem marcar: ignorado
    form.append("crop", "tomato");
    form.append("crop", "corn");
    expect(parseFarmForm(form)).toEqual({ animals: { chickens: "12" }, crops: ["tomato", "corn"] });
  });

  it("animal marcado sem quantidade vira texto vazio (a validação reclama)", () => {
    const form = new FormData();
    form.set("animal:ducks", "on");
    expect(parseFarmForm(form)).toEqual({ animals: { ducks: "" }, crops: [] });
  });
});

describe("parseCityField", () => {
  it("lê a cidade escolhida", () => {
    expect(parseCityField('{"label":"X","latitude":1,"longitude":2,"countryCode":"BR"}')).toEqual({
      label: "X",
      latitude: 1,
      longitude: 2,
      countryCode: "BR",
    });
  });

  it("devolve null para vazio ou texto quebrado", () => {
    expect(parseCityField("")).toBeNull();
    expect(parseCityField("{quebrado")).toBeNull();
    expect(parseCityField(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/farm-validation.test.ts`
Expected: FAIL — `farmSchema` não exportado.

- [ ] **Step 3: Implementar**

Em `src/lib/validation.ts`, acrescentar no topo `import { ANIMAL_IDS, CROP_IDS } from "./catalog";` e no fim:
```ts
export const MAX_ANIMAL_COUNT = 100_000;

const animalCount = z.coerce
  .number({ invalid_type_error: "countInvalid" })
  .int("countInvalid")
  .min(1, "countTooSmall")
  .max(MAX_ANIMAL_COUNT, "countTooLarge");

export const farmSchema = z.object({
  animals: z.record(z.enum(ANIMAL_IDS), animalCount),
  crops: z.array(z.enum(CROP_IDS)),
});
export type FarmInput = z.infer<typeof farmSchema>;

export function parseFarmForm(formData: FormData): { animals: Record<string, string>; crops: string[] } {
  const animals: Record<string, string> = {};
  for (const id of ANIMAL_IDS) {
    if (formData.get(`animal:${id}`) === "on") animals[id] = String(formData.get(`count:${id}`) ?? "");
  }
  return { animals, crops: formData.getAll("crop").map(String) };
}

export function parseCityField(raw: FormDataEntryValue | null): unknown {
  try {
    return typeof raw === "string" && raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
```
e trocar o corpo de `toFieldErrors` para usar o caminho completo:
```ts
export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.length ? issue.path.join(".") : "form";
    result[field] ??= issue.message;
  }
  return result;
}
```

Em `src/app/actions/auth.ts`: apagar a função local `parseCity`, importar `parseCityField` de `@/lib/validation` e usar `city: parseCityField(formData.get("city"))`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos, inclusive os de validação da Etapa 1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/app/actions/auth.ts tests/unit/farm-validation.test.ts
git commit -m "feat: validação do formulário da fazenda"
```

---

### Task 3: Guardar a fazenda e trocar a cidade

**Files:**
- Create: `src/server/farm.ts`
- Modify: `src/server/registration.ts`
- Test: `tests/integration/farm.test.ts`, `tests/integration/change-city.test.ts`

**Interfaces:**
- Consumes: `FarmInput`, `CityChoice` (Task 2 / Etapa 1); `ANIMALS`, `CROPS`, `AnimalId`, `CropId` (Task 1); `resolveClimate` (Etapa 1).
- Produces: `interface Farm { animals: { id: AnimalId; count: number }[]; crops: CropId[] }` (sempre na ordem do catálogo); `getFarm(db, userId): Farm`; `saveFarm(db, userId, farm: FarmInput): void` (substitui tudo, numa transação); `changeCity(db, provider, userId, city: CityChoice): Promise<ResolvedClimate>`.

- [ ] **Step 1: Testes**

`tests/integration/farm.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getFarm, saveFarm } from "@/server/farm";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("fazenda", () => {
  it("começa vazia", async () => {
    const db = testDb();
    expect(getFarm(db, await makeUser(db))).toEqual({ animals: [], crops: [] });
  });

  it("salva e devolve na ordem do catálogo", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["corn", "tomato"] });
    expect(getFarm(db, id)).toEqual({
      animals: [
        { id: "chickens", count: 12 },
        { id: "goats", count: 3 },
      ],
      crops: ["tomato", "corn"],
    });
  });

  it("salvar de novo substitui tudo (tirar um animal remove)", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["tomato"] });
    saveFarm(db, id, { animals: { chickens: 15 }, crops: [] });
    expect(getFarm(db, id)).toEqual({ animals: [{ id: "chickens", count: 15 }], crops: [] });
  });

  it("plantação repetida conta uma vez só (clique duplo)", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: {}, crops: ["tomato", "tomato"] });
    expect(getFarm(db, id).crops).toEqual(["tomato"]);
  });

  it("não mexe na fazenda de outra pessoa", async () => {
    const db = testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    saveFarm(db, ana, { animals: { cows: 2 }, crops: [] });
    saveFarm(db, bia, { animals: { pigs: 4 }, crops: [] });
    expect(getFarm(db, ana).animals).toEqual([{ id: "cows", count: 2 }]);
  });
});
```

`tests/integration/change-city.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getUserById } from "@/server/accounts";
import { changeCity } from "@/server/registration";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("changeCity", () => {
  it("troca a cidade e recalcula clima e hemisfério", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const provider = createFakeWeatherProvider();
    const [lisboa] = await provider.searchCities("Lisboa", "pt");
    await changeCity(db, provider, id, lisboa);
    expect(getUserById(db, id)).toMatchObject({
      cityLabel: "Lisboa, Lisboa, Portugal",
      latitude: 38.72,
      countryCode: "PT",
      climateZone: "subtropical",
      climateEstimated: false,
      hemisphere: "north",
    });
  });

  it("serviço de clima fora: estima pela latitude", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const [campinas] = await createFakeWeatherProvider().searchCities("Campinas", "pt");
    await changeCity(db, createFakeWeatherProvider({ failNormals: true }), id, campinas);
    expect(getUserById(db, id)).toMatchObject({ climateZone: "tropical", climateEstimated: true });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/integration/farm.test.ts tests/integration/change-city.test.ts`
Expected: FAIL — `@/server/farm` não existe; `changeCity` não exportado.

- [ ] **Step 3: Implementar**

`src/server/farm.ts`:
```ts
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
```

Em `src/server/registration.ts`, acrescentar `import type { CityChoice } from "@/lib/validation";` (junto do import de `SignupInput`) e:
```ts
export async function changeCity(
  db: Db,
  provider: WeatherProvider,
  userId: number,
  city: CityChoice,
): Promise<ResolvedClimate> {
  const climate = await resolveClimate(provider, city.latitude, city.longitude);
  db.prepare(
    `UPDATE users SET city_label = ?, latitude = ?, longitude = ?, country_code = ?,
      climate_zone = ?, climate_estimated = ?, hemisphere = ? WHERE id = ?`,
  ).run(
    city.label,
    city.latitude,
    city.longitude,
    city.countryCode,
    climate.zone,
    climate.estimated ? 1 : 0,
    climate.hemisphere,
    userId,
  );
  return climate;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/integration/farm.test.ts tests/integration/change-city.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/farm.ts src/server/registration.ts tests/integration/farm.test.ts tests/integration/change-city.test.ts
git commit -m "feat: guardar a fazenda e trocar a cidade"
```

---

### Task 4: Previsão de 5 dias com cache

**Files:**
- Create: `src/server/forecast.ts`, `src/lib/weather-codes.ts`, `src/lib/format.ts`
- Modify: `src/server/weather/types.ts`, `src/server/weather/open-meteo.ts`, `src/server/weather/fake.ts`
- Test: `tests/integration/forecast.test.ts`, `tests/unit/weather-codes.test.ts`, `tests/unit/format.test.ts`; acrescentar casos em `tests/integration/open-meteo.test.ts` e `tests/live/open-meteo.live.test.ts`

**Interfaces:**
- Produces:
  - `interface DayForecast { date: string; max: number; min: number; rainChance: number | null; weatherCode: number }`
  - `interface Forecast { current: { temperature: number; weatherCode: number }; days: DayForecast[] }`
  - `WeatherProvider.getForecast(latitude: number, longitude: number): Promise<Forecast>`
  - `createFakeWeatherProvider({ failNormals?, failForecast? })` — previsão fixa: agora 18 °C código 2; dias (máx/mín/chuva/código) 22/13/40/2, 19/12/85/61, 20/11/55/80, 25/12/5/0, 27/14/0/0 a partir de hoje.
  - `FORECAST_TTL_MS = 3600000`; `type ForecastResult = { forecast: Forecast; fetchedAt: number; stale: boolean } | null`; `getForecast(db, provider, latitude, longitude, now?): Promise<ForecastResult>`
  - `type WeatherKey = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "showers" | "thunder"`; `describeWeather(code: number): { icon: string; key: WeatherKey }`
  - `formatDay(date: string, locale: Locale, style: "short" | "long"): string`; `formatTime(ms: number, locale: Locale): string`

- [ ] **Step 1: Testes**

`tests/unit/weather-codes.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { describeWeather } from "@/lib/weather-codes";

describe("describeWeather (códigos WMO do Open-Meteo)", () => {
  it.each([
    [0, "clear", "☀️"],
    [2, "partlyCloudy", "⛅"],
    [3, "cloudy", "☁️"],
    [45, "fog", "🌫️"],
    [53, "drizzle", "🌦️"],
    [63, "rain", "🌧️"],
    [73, "snow", "❄️"],
    [81, "showers", "🌦️"],
    [95, "thunder", "⛈️"],
  ])("código %i → %s", (code, key, icon) => {
    expect(describeWeather(code)).toEqual({ key, icon });
  });

  it("código desconhecido vira nublado", () => {
    expect(describeWeather(999).key).toBe("cloudy");
  });
});
```

`tests/unit/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDay, formatTime } from "@/lib/format";

describe("formatDay", () => {
  it("dia curto em português e inglês (29/10/2026 é quinta-feira)", () => {
    expect(formatDay("2026-10-29", "pt", "short").toLowerCase()).toContain("qui");
    expect(formatDay("2026-10-29", "en", "short")).toContain("Thu");
  });

  it("dia longo traz o dia do mês", () => {
    expect(formatDay("2026-10-29", "pt", "long")).toContain("29");
    expect(formatDay("2026-10-29", "en", "long")).toContain("29");
  });
});

describe("formatTime", () => {
  it("mostra horas e minutos", () => {
    expect(formatTime(Date.UTC(2026, 9, 29, 14, 5), "pt")).toMatch(/\d{2}:\d{2}/);
  });
});
```
`tests/integration/forecast.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { FORECAST_TTL_MS, getForecast } from "@/server/forecast";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import type { WeatherProvider } from "@/server/weather/types";
import { testDb } from "../helpers/db";

function spyProvider(options: { failForecast?: boolean } = {}) {
  const fake = createFakeWeatherProvider(options);
  const getForecastSpy = vi.fn(fake.getForecast);
  const provider: WeatherProvider = { ...fake, getForecast: getForecastSpy };
  return { provider, getForecastSpy };
}

describe("getForecast", () => {
  it("busca, guarda e usa a guardada por 1 hora", async () => {
    const db = testDb();
    const { provider, getForecastSpy } = spyProvider();
    const first = await getForecast(db, provider, -25.43, -49.27, 0);
    expect(first).toMatchObject({ stale: false, fetchedAt: 0 });
    expect(first!.forecast.days).toHaveLength(5);

    await getForecast(db, provider, -25.43, -49.27, FORECAST_TTL_MS - 1);
    expect(getForecastSpy).toHaveBeenCalledTimes(1);

    await getForecast(db, provider, -25.43, -49.27, FORECAST_TTL_MS + 1);
    expect(getForecastSpy).toHaveBeenCalledTimes(2);
  });

  it("coordenadas quase iguais usam a mesma previsão guardada", async () => {
    const db = testDb();
    const { provider, getForecastSpy } = spyProvider();
    await getForecast(db, provider, -25.4278, -49.2731, 0);
    await getForecast(db, provider, -25.4301, -49.2699, 10);
    expect(getForecastSpy).toHaveBeenCalledTimes(1);
  });

  it("serviço fora: devolve a guardada marcada como antiga", async () => {
    const db = testDb();
    await getForecast(db, spyProvider().provider, -25.43, -49.27, 0);
    const result = await getForecast(db, spyProvider({ failForecast: true }).provider, -25.43, -49.27, FORECAST_TTL_MS * 3);
    expect(result).toMatchObject({ stale: true, fetchedAt: 0 });
  });

  it("serviço fora e nada guardado: devolve null", async () => {
    const db = testDb();
    expect(await getForecast(db, spyProvider({ failForecast: true }).provider, -25.43, -49.27, 0)).toBeNull();
  });
});
```

Acrescentar em `tests/integration/open-meteo.test.ts`:
```ts
describe("Open-Meteo: getForecast", () => {
  it("pede 5 dias e converte a resposta", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        current: { temperature_2m: 18.4, weather_code: 2 },
        daily: {
          time: ["2026-10-29", "2026-10-30"],
          temperature_2m_max: [22, 19],
          temperature_2m_min: [13, 12],
          precipitation_probability_max: [40, null],
          weather_code: [2, 61],
        },
      }),
    );
    const provider = createOpenMeteoProvider(fetchMock as unknown as typeof fetch);
    const forecast = await provider.getForecast(-25.43, -49.27);
    expect(forecast).toEqual({
      current: { temperature: 18.4, weatherCode: 2 },
      days: [
        { date: "2026-10-29", max: 22, min: 13, rainChance: 40, weatherCode: 2 },
        { date: "2026-10-30", max: 19, min: 12, rainChance: null, weatherCode: 61 },
      ],
    });
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("forecast_days")).toBe("5");
    expect(url.searchParams.get("timezone")).toBe("auto");
  });
});
```

Acrescentar em `tests/live/open-meteo.live.test.ts`:
```ts
  it("devolve previsão real de 5 dias", async () => {
    const forecast = await provider.getForecast(-22.9, -47.06);
    expect(forecast.days).toHaveLength(5);
    expect(typeof forecast.current.temperature).toBe("number");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/weather-codes.test.ts tests/unit/format.test.ts tests/integration/forecast.test.ts tests/integration/open-meteo.test.ts`
Expected: FAIL — módulos/funções não existem.

- [ ] **Step 3: Implementar**

`src/server/weather/types.ts` (acrescentar tipos e método):
```ts
export interface DayForecast {
  date: string;
  max: number;
  min: number;
  rainChance: number | null;
  weatherCode: number;
}

export interface Forecast {
  current: { temperature: number; weatherCode: number };
  days: DayForecast[];
}
```
e na interface `WeatherProvider`: `getForecast(latitude: number, longitude: number): Promise<Forecast>;`

Em `src/server/weather/open-meteo.ts`, acrescentar o método ao objeto devolvido:
```ts
    async getForecast(latitude: number, longitude: number) {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("current", "temperature_2m,weather_code");
      url.searchParams.set(
        "daily",
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
      );
      url.searchParams.set("forecast_days", "5");
      url.searchParams.set("timezone", "auto");
      const body = await getJson<{
        current: { temperature_2m: number; weather_code: number };
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: (number | null)[];
          weather_code: number[];
        };
      }>(url);
      return {
        current: { temperature: body.current.temperature_2m, weatherCode: body.current.weather_code },
        days: body.daily.time.map((date, i) => ({
          date,
          max: body.daily.temperature_2m_max[i],
          min: body.daily.temperature_2m_min[i],
          rainChance: body.daily.precipitation_probability_max[i] ?? null,
          weatherCode: body.daily.weather_code[i],
        })),
      };
    },
```

Em `src/server/weather/fake.ts`: a assinatura passa a `createFakeWeatherProvider(options: { failNormals?: boolean; failForecast?: boolean } = {})` e o objeto ganha:
```ts
    async getForecast() {
      if (options.failForecast) throw new Error("serviço de previsão fora (falso)");
      const today = Date.now();
      const days = [
        [22, 13, 40, 2],
        [19, 12, 85, 61],
        [20, 11, 55, 80],
        [25, 12, 5, 0],
        [27, 14, 0, 0],
      ].map(([max, min, rainChance, weatherCode], i) => ({
        date: new Date(today + i * 86_400_000).toISOString().slice(0, 10),
        max,
        min,
        rainChance,
        weatherCode,
      }));
      return { current: { temperature: 18, weatherCode: 2 }, days };
    },
```

`src/server/forecast.ts`:
```ts
import type { Db } from "./db";
import type { Forecast, WeatherProvider } from "./weather/types";

export const FORECAST_TTL_MS = 60 * 60_000;

export type ForecastResult = { forecast: Forecast; fetchedAt: number; stale: boolean } | null;

export async function getForecast(
  db: Db,
  provider: WeatherProvider,
  latitude: number,
  longitude: number,
  now = Date.now(),
): Promise<ForecastResult> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = db.prepare("SELECT payload, fetched_at FROM weather_cache WHERE key = ?").get(key) as
    | { payload: string; fetched_at: number }
    | undefined;
  if (cached && now - cached.fetched_at < FORECAST_TTL_MS) {
    return { forecast: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: false };
  }
  try {
    const forecast = await provider.getForecast(latitude, longitude);
    db.prepare(
      `INSERT INTO weather_cache (key, payload, fetched_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    ).run(key, JSON.stringify(forecast), now);
    return { forecast, fetchedAt: now, stale: false };
  } catch {
    return cached ? { forecast: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: true } : null;
  }
}
```

`src/lib/weather-codes.ts`:
```ts
export type WeatherKey = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "showers" | "thunder";

// Códigos WMO usados pelo Open-Meteo: https://open-meteo.com/en/docs (seção "WMO Weather interpretation codes").
export function describeWeather(code: number): { icon: string; key: WeatherKey } {
  if (code === 0) return { key: "clear", icon: "☀️" };
  if (code === 1 || code === 2) return { key: "partlyCloudy", icon: "⛅" };
  if (code === 45 || code === 48) return { key: "fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { key: "drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { key: "rain", icon: "🌧️" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { key: "snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { key: "showers", icon: "🌦️" };
  if (code >= 95 && code <= 99) return { key: "thunder", icon: "⛈️" };
  return { key: "cloudy", icon: "☁️" };
}
```

`src/lib/format.ts`:
```ts
import type { Locale } from "@/i18n/locales";

const intlLocale = (locale: Locale) => (locale === "pt" ? "pt-BR" : "en-US");

export function formatDay(date: string, locale: Locale, style: "short" | "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { weekday: "short", timeZone: "UTC" }
      : { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` e `npm run test:live`
Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add src/server/forecast.ts src/server/weather src/lib/weather-codes.ts src/lib/format.ts tests
git commit -m "feat: previsão real de 5 dias com cache de 1 hora"
```

---

### Task 5: Formulário "Minha fazenda" e etapa 2 do cadastro

**Files:**
- Create: `src/components/FarmForm.tsx`, `src/app/actions/farm.ts`, `src/app/(app)/boas-vindas/page.tsx`
- Modify: `src/app/actions/auth.ts` (redireciona para `/boas-vindas`), `src/middleware.ts` (protege `/boas-vindas`)

**Interfaces:**
- Consumes: `FormState` (Etapa 1); `farmSchema`, `parseFarmForm`, `parseCityField`, `citySchema`, `toFieldErrors` (Task 2); `getFarm`, `saveFarm`, `Farm`, `changeCity` (Task 3); catálogo (Task 1).
- Produces: `<FarmForm initial={Farm} action={...} submitLabel={string} footer?={ReactNode} />` com campos `animal:<id>` (checkbox), `count:<id>` (número, `id="count-<id>"`), `crop` (checkbox); actions `saveFarmAction`, `saveFarmAndContinueAction`, `changeCityAction`.

- [ ] **Step 1: Actions**

`src/app/actions/farm.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { citySchema, farmSchema, parseCityField, parseFarmForm, toFieldErrors } from "@/lib/validation";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { saveFarm } from "@/server/farm";
import { changeCity } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";
import type { FormState } from "./auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function validateAndSave(formData: FormData): Promise<FormState | null> {
  const user = await requireUser();
  const parsed = farmSchema.safeParse(parseFarmForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  saveFarm(getDb(), user.id, parsed.data);
  return null;
}

export async function saveFarmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData);
  if (error) return error;
  revalidatePath("/", "layout");
  return { done: true };
}

export async function saveFarmAndContinueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData);
  if (error) return error;
  redirect("/painel");
}

export async function changeCityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = citySchema.safeParse(parseCityField(formData.get("city")));
  if (!parsed.success) return { fieldErrors: { city: "cityRequired" } };
  await changeCity(getDb(), getWeatherProvider(), user.id, parsed.data);
  revalidatePath("/", "layout");
  return { done: true };
}
```

- [ ] **Step 2: Componente do formulário**

`src/components/FarmForm.tsx` (campos controlados: o React 19 limpa formulários depois de cada envio, e os controlados mantêm o que a pessoa digitou):
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ANIMALS, CROPS, CROP_GROUPS } from "@/lib/catalog";
import type { Farm } from "@/server/farm";
import { FieldError } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function FarmForm({
  initial,
  action,
  submitLabel,
  footer,
}: {
  initial: Farm;
  action: Action;
  submitLabel: string;
  footer?: React.ReactNode;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(initial.animals.map((a) => [a.id, String(a.count)])),
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.animals.map((a) => [a.id, true])),
  );
  const [crops, setCrops] = useState<Set<string>>(new Set(initial.crops));
  const errors = state.fieldErrors ?? {};

  function toggleCrop(id: string, on: boolean) {
    setCrops((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} noValidate className="space-y-10">
      <section>
        <h2 className="font-display text-2xl font-bold">{t("farm.animalsTitle")}</h2>
        <p className="text-sm text-muted">{t("farm.animalsHelp")}</p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {ANIMALS.map((animal) => {
            const on = checked[animal.id] ?? false;
            return (
              <div
                key={animal.id}
                className={`rounded-3xl p-5 transition ${on ? "bg-soft ring-2 ring-primary" : "bg-surface ring-1 ring-border"}`}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name={`animal:${animal.id}`}
                    checked={on}
                    onChange={(e) => setChecked((c) => ({ ...c, [animal.id]: e.target.checked }))}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className="text-3xl" aria-hidden>{animal.icon}</span>
                  <span className="font-semibold">{t(`animals.${animal.id}`)}</span>
                </label>
                {on && (
                  <div className="mt-3">
                    <label htmlFor={`count-${animal.id}`} className="text-sm text-muted">{t("farm.howMany")}</label>
                    <input
                      id={`count-${animal.id}`}
                      name={`count:${animal.id}`}
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      inputMode="numeric"
                      value={counts[animal.id] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [animal.id]: e.target.value }))}
                      aria-describedby={`count-${animal.id}-error`}
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                    />
                    <FieldError id={`count-${animal.id}-error`} code={errors[`animals.${animal.id}`]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">{t("farm.cropsTitle")}</h2>
        <p className="text-sm text-muted">{t("farm.cropsHelp")}</p>
        {CROP_GROUPS.map((group) => (
          <fieldset key={group} className="mt-5">
            <legend className="mb-2 font-semibold text-accent">{t(`cropGroups.${group}`)}</legend>
            <div className="flex flex-wrap gap-2">
              {CROPS.filter((c) => c.group === group).map((crop) => (
                <label
                  key={crop.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-border has-[:checked]:bg-soft has-[:checked]:ring-2 has-[:checked]:ring-primary"
                >
                  <input
                    type="checkbox"
                    name="crop"
                    value={crop.id}
                    checked={crops.has(crop.id)}
                    onChange={(e) => toggleCrop(crop.id, e.target.checked)}
                    className="accent-primary"
                  />
                  <span aria-hidden>{crop.icon}</span>
                  {t(`crops.${crop.id}`)}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      {state.done && (
        <p role="status" className="rounded-xl bg-soft px-4 py-3 font-semibold">{t("farm.saved")}</p>
      )}
      <div className="flex items-center gap-6">
        <div className="w-60">
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        </div>
        {footer}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Página da etapa 2 e redirecionamento**

`src/app/(app)/boas-vindas/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { saveFarmAndContinueAction } from "@/app/actions/farm";
import { FarmForm } from "@/components/FarmForm";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export default async function WelcomeFarmPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations("farm");
  return (
    <section className="max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("step")}</p>
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("help")}</p>
      <div className="mt-8">
        <FarmForm
          initial={getFarm(getDb(), user.id)}
          action={saveFarmAndContinueAction}
          submitLabel={t("continue")}
          footer={<Link href="/painel" className="text-accent hover:underline">{t("skip")}</Link>}
        />
      </div>
    </section>
  );
}
```

Em `src/app/actions/auth.ts`, no fim de `signupAction`: `redirect("/boas-vindas");` (no lugar de `/painel`).

Em `src/middleware.ts`, acrescentar `"/boas-vindas/:path*"` ao `matcher`.

- [ ] **Step 4: Conferir build e testes**

Run: `npm run build && npm test`
Expected: build sem erros; testes PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: etapa 2 do cadastro com animais e plantações"
```

---

### Task 6: MyFarm, aba Clima, Painel e trilho de navegação

**Files:**
- Create: `src/components/NavRail.tsx`, `src/components/CityForm.tsx`, `src/components/WeatherHero.tsx`, `src/app/(app)/myfarm/page.tsx`, `src/app/(app)/clima/page.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/painel/page.tsx`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: rotas `/myfarm`, `/clima`; `data-testid` para o E2E: `current-city`, `weather-hero`, `day-card`, `animal-tile-<id>`, `crop-chips`, `weather-stale`, `weather-unavailable`.

- [ ] **Step 1: Trilho de navegação com página ativa**

`src/components/NavRail.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavRail({ items, label }: { items: { href: string; icon: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex w-20 shrink-0 flex-col items-center gap-3 bg-rail py-6" aria-label={label}>
      <p className="mb-6 text-2xl" aria-hidden>🌾</p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${active ? "bg-soft dark:bg-primary" : "hover:bg-white/15"}`}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
```

Em `src/app/(app)/layout.tsx`: trocar o bloco `<nav>…</nav>` e a constante `nav` por
```tsx
  const nav = [
    { href: "/painel", icon: "📊", label: t("nav.dashboard") },
    { href: "/myfarm", icon: "🏡", label: t("nav.myfarm") },
    { href: "/clima", icon: "☀️", label: t("nav.weather") },
  ];
```
e `<NavRail items={nav} label={t("app.name")} />` (import de `@/components/NavRail`; remover o import de `Link` se não for mais usado).

- [ ] **Step 2: Bloco de clima (Painel) e aba Clima**

`src/components/WeatherHero.tsx`:
```tsx
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveLocale } from "@/i18n/locales";
import { formatDay, formatTime } from "@/lib/format";
import { describeWeather } from "@/lib/weather-codes";
import type { ForecastResult } from "@/server/forecast";

export async function WeatherHero({ result }: { result: ForecastResult }) {
  const t = await getTranslations("weather");
  const locale = resolveLocale(await getLocale());

  if (!result) {
    return (
      <section data-testid="weather-hero" className="col-span-2 row-span-2 flex items-center justify-center rounded-3xl bg-soft p-6 text-center">
        <p data-testid="weather-unavailable">{t("unavailable")}</p>
      </section>
    );
  }

  const now = describeWeather(result.forecast.current.weatherCode);
  return (
    <section
      data-testid="weather-hero"
      className="col-span-2 row-span-2 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#9cc58a] to-[#fbeedd] p-6 text-[#1f3a1c] dark:from-[#2c4a2a] dark:to-[#2b2316] dark:text-[#ece6d6]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold opacity-70">{t("now")}</p>
          <p className="font-display text-7xl font-bold">{Math.round(result.forecast.current.temperature)}°</p>
          <p>{t(now.key)}</p>
          {result.stale && (
            <p data-testid="weather-stale" className="mt-1 text-xs opacity-80">
              {t("updatedAt", { time: formatTime(result.fetchedAt, locale) })}
            </p>
          )}
        </div>
        <span className="text-7xl" aria-hidden>{now.icon}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {result.forecast.days.map((day) => (
          <div key={day.date} className="rounded-2xl bg-white/50 p-2 text-center dark:bg-black/25">
            <p className="text-xs font-bold capitalize">{formatDay(day.date, locale, "short")}</p>
            <p className="text-xl" aria-hidden>{describeWeather(day.weatherCode).icon}</p>
            <p className="text-sm">{Math.round(day.max)}°/{Math.round(day.min)}°</p>
            {day.rainChance !== null && <p className="text-[10px] opacity-70">💧 {day.rainChance}%</p>}
          </div>
        ))}
      </div>
      <Link href="/clima" className="text-right text-xs font-semibold underline-offset-2 hover:underline">{t("seeAll")} →</Link>
    </section>
  );
}
```

`src/app/(app)/clima/page.tsx`:
```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { formatDay, formatTime } from "@/lib/format";
import { describeWeather } from "@/lib/weather-codes";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getForecast } from "@/server/forecast";
import { getWeatherProvider } from "@/server/weather";

export default async function WeatherPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations("weather");
  const locale = resolveLocale(await getLocale());
  const result = await getForecast(getDb(), getWeatherProvider(), user.latitude, user.longitude);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
        <p className="text-muted">{user.cityLabel}</p>
      </div>
      {!result ? (
        <p data-testid="weather-unavailable" role="status" className="rounded-2xl bg-soft p-6">{t("unavailable")}</p>
      ) : (
        <>
          {result.stale && (
            <p data-testid="weather-stale" role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm">
              {t("updatedAt", { time: formatTime(result.fetchedAt, locale) })}
            </p>
          )}
          <div className="flex items-center gap-6 rounded-3xl bg-gradient-to-br from-[#9cc58a] to-[#fbeedd] p-8 text-[#1f3a1c] dark:from-[#2c4a2a] dark:to-[#2b2316] dark:text-[#ece6d6]">
            <span className="text-7xl" aria-hidden>{describeWeather(result.forecast.current.weatherCode).icon}</span>
            <div>
              <p className="text-sm font-semibold opacity-70">{t("now")}</p>
              <p className="font-display text-6xl font-bold">{Math.round(result.forecast.current.temperature)}°</p>
              <p>{t(describeWeather(result.forecast.current.weatherCode).key)}</p>
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold">{t("next5")}</h2>
          <div className="grid grid-cols-5 gap-4">
            {result.forecast.days.map((day) => {
              const w = describeWeather(day.weatherCode);
              return (
                <article key={day.date} data-testid="day-card" className="rounded-3xl bg-surface p-5 text-center ring-1 ring-border">
                  <p className="font-bold capitalize">{formatDay(day.date, locale, "long")}</p>
                  <p className="my-3 text-5xl" aria-hidden>{w.icon}</p>
                  <p className="text-sm text-muted">{t(w.key)}</p>
                  <p className="mt-2">
                    <span className="font-bold">{t("max")} {Math.round(day.max)}°</span>{" "}
                    <span className="text-muted">{t("min")} {Math.round(day.min)}°</span>
                  </p>
                  {day.rainChance !== null && <p className="text-sm text-muted">💧 {t("rainChance")} {day.rainChance}%</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Painel no formato da variante D**

`src/app/(app)/painel/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { WeatherHero } from "@/components/WeatherHero";
import { ANIMALS, CROPS } from "@/lib/catalog";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";
import { getForecast } from "@/server/forecast";
import { getWeatherProvider } from "@/server/weather";

const TILE_COLORS = [
  "bg-[#fbeedd] dark:bg-[#2b2316]",
  "bg-[#e3eed8] dark:bg-[#1f2a1b]",
  "bg-[#f3e2c7] dark:bg-[#33281a]",
];

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  const db = getDb();
  const farm = getFarm(db, user.id);
  const forecast = await getForecast(db, getWeatherProvider(), user.latitude, user.longitude);
  const icon = (id: string) => ANIMALS.find((a) => a.id === id)!.icon;

  return (
    <section>
      <h1 className="font-display text-3xl font-bold">{t("dashboard.hello", { name: user.name })}</h1>
      <div className="mt-6 grid auto-rows-[150px] grid-cols-4 gap-4">
        <WeatherHero result={forecast} />

        {farm.animals.map((animal, i) => (
          <section
            key={animal.id}
            data-testid={`animal-tile-${animal.id}`}
            className={`flex flex-col justify-between rounded-3xl p-5 ${TILE_COLORS[i % TILE_COLORS.length]}`}
          >
            <span className="text-4xl" aria-hidden>{icon(animal.id)}</span>
            <div>
              <p className="font-display text-4xl font-bold">{animal.count}</p>
              <p className="text-sm opacity-70">{t(`animals.${animal.id}`)}</p>
            </div>
          </section>
        ))}

        <Link
          href="/myfarm"
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/30 text-center text-primary hover:bg-soft"
        >
          <span className="text-3xl" aria-hidden>＋</span>
          <span className="text-sm">{farm.animals.length ? t("dashboard.addAnimal") : t("dashboard.noAnimals")}</span>
        </Link>

        <section data-testid="crop-chips" className="col-span-4 rounded-3xl bg-surface p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("dashboard.myCrops")}</p>
            <Link href="/myfarm" className="text-sm text-primary hover:underline">{t("dashboard.editFarm")}</Link>
          </div>
          {farm.crops.length ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {farm.crops.map((id) => (
                  <span key={id} className="rounded-full bg-bg px-4 py-2">
                    <span aria-hidden>{CROPS.find((c) => c.id === id)!.icon}</span> <b>{t(`crops.${id}`)}</b>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">{t("dashboard.cropsSoon")}</p>
            </>
          ) : (
            <p className="mt-3 text-muted">{t("dashboard.noCrops")}</p>
          )}
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: MyFarm**

`src/components/CityForm.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { changeCityAction } from "@/app/actions/farm";
import type { FormState } from "@/app/actions/auth";
import { CityPicker } from "./CityPicker";
import { SubmitButton } from "./SubmitButton";

export function CityForm() {
  const t = useTranslations("myfarm");
  const [state, action, pending] = useActionState<FormState, FormData>(changeCityAction, {});
  return (
    <form action={action} noValidate className="mt-4 flex items-start gap-4">
      <div className="flex-1">
        <CityPicker error={state.fieldErrors?.city} />
      </div>
      <div className="mt-6 w-48">
        <SubmitButton pending={pending}>{t("saveCity")}</SubmitButton>
      </div>
      {state.done && <p role="status" className="sr-only">{t("cityChanged")}</p>}
      {state.done && (
        <p aria-hidden className="mt-7 max-w-xs text-sm font-semibold text-primary">{t("cityChanged")}</p>
      )}
    </form>
  );
}
```

`src/app/(app)/myfarm/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { saveFarmAction } from "@/app/actions/farm";
import { CityForm } from "@/components/CityForm";
import { FarmForm } from "@/components/FarmForm";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export default async function MyFarmPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  return (
    <section className="max-w-4xl space-y-10">
      <h1 className="font-display text-4xl font-bold">{t("myfarm.title")}</h1>
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("myfarm.cityTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("myfarm.currentCity")}: <b data-testid="current-city">{user.cityLabel}</b>
        </p>
        <CityForm />
      </div>
      <FarmForm initial={getFarm(getDb(), user.id)} action={saveFarmAction} submitLabel={t("farm.save")} />
    </section>
  );
}
```

- [ ] **Step 5: Conferir build, testes e uso manual**

Run: `rm -rf .next && npm run build && npm test`
Expected: build sem erros; testes PASS. Abrir `npm run dev` e conferir Painel, MyFarm e Clima com uma conta real.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: MyFarm, aba Clima e Painel com clima, animais e plantações"
```

---

### Task 7: Robô de ponta a ponta da Etapa 2

**Files:**
- Create: `tests/e2e/helpers.ts`, `tests/e2e/farm.spec.ts`
- Modify: `tests/e2e/auth.spec.ts` (usa o helper; cadastro agora passa por `/boas-vindas`)

**Interfaces:**
- Consumes: rotas e `data-testid` da Task 6; provedor falso (`WEATHER_FAKE=1`): agora 18 °C, Curitiba subtropical sul, Lisboa subtropical norte.

- [ ] **Step 1: Helper compartilhado**

`tests/e2e/helpers.ts`:
```ts
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "segredo123";

export function uniqueEmail() {
  return `ana+${Date.now()}${Math.floor(Math.random() * 1000)}@exemplo.com`;
}

/** Faz a etapa 1 do cadastro e para na etapa 2 (/boas-vindas). */
export async function createAccount(page: Page, email: string, city = "Curitiba") {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill(city);
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
}

/** Cadastro completo pulando a etapa 2: termina no Painel. */
export async function signup(page: Page, email: string, city = "Curitiba") {
  await createAccount(page, email, city);
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}
```

Em `tests/e2e/auth.spec.ts`: apagar `PASSWORD`, `uniqueEmail` e `signup` locais e importar de `./helpers`; no teste "e-mail repetido…", nada muda (ele não passa pela etapa 2). Renomear o primeiro teste para "cadastro passa pela etapa 2 e chega ao painel com o tipo de clima da cidade" (o helper já cobre a etapa 2).

- [ ] **Step 2: Testes da Etapa 2**

`tests/e2e/farm.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
import { createAccount, signup, uniqueEmail } from "./helpers";

test("etapa 2 do cadastro salva animais e plantações e mostra no painel", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Minha fazenda" })).toBeVisible();

  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("12");
  await page.getByLabel("Cabras").check();
  await page.locator("#count-goats").fill("3");
  await page.getByLabel("Tomate").check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("animal-tile-chickens")).toContainText("12");
  await expect(page.getByTestId("animal-tile-goats")).toContainText("3");
  await expect(page.getByTestId("crop-chips")).toContainText("Tomate");
  await expect(page.getByTestId("weather-hero")).toContainText("18°");
});

test("quantidade inválida mostra erro e não sai da etapa 2", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Porcos").check();
  await page.locator("#count-pigs").fill("0");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Informe pelo menos 1")).toBeVisible();
  await expect(page).toHaveURL(/\/boas-vindas$/);
  await expect(page.locator("#count-pigs")).toHaveValue("0");
});

test("pular a etapa 2 leva ao painel vazio", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page.getByText("Você ainda não marcou animais.")).toBeVisible();
  await expect(page.getByText("Você ainda não marcou plantações.")).toBeVisible();
});

test("MyFarm edita animais e plantações", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("12");
  await page.getByLabel("Tomate").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  await page.getByRole("link", { name: "MyFarm" }).click();
  await expect(page.locator("#count-chickens")).toHaveValue("12");
  await page.locator("#count-chickens").fill("15");
  await page.getByLabel("Patos").check();
  await page.locator("#count-ducks").fill("5");
  await page.getByLabel("Tomate").uncheck();
  await page.getByLabel("Milho").check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo!")).toBeVisible();

  await page.getByRole("link", { name: "Painel" }).click();
  await expect(page.getByTestId("animal-tile-chickens")).toContainText("15");
  await expect(page.getByTestId("animal-tile-ducks")).toContainText("5");
  await expect(page.getByTestId("crop-chips")).toContainText("Milho");
  await expect(page.getByTestId("crop-chips")).not.toContainText("Tomate");
});

test("MyFarm troca a cidade e o clima acompanha", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/myfarm");
  await expect(page.getByTestId("current-city")).toContainText("Curitiba");
  await page.getByTestId("city-input").fill("Lisboa");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Trocar cidade" }).click();
  await expect(page.getByText("Cidade atualizada.", { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("current-city")).toContainText("Lisboa");
  await expect(page.getByTestId("user-climate")).toContainText("Hemisfério norte");
});

test("aba Clima mostra a previsão de 5 dias", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Clima" }).click();
  await expect(page).toHaveURL(/\/clima$/);
  await expect(page.getByTestId("day-card")).toHaveCount(5);
  await expect(page.getByText("Próximos 5 dias")).toBeVisible();
});

test("MyFarm e Clima exigem login", async ({ page }) => {
  for (const path of ["/myfarm", "/clima", "/boas-vindas"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
```

- [ ] **Step 3: Rodar**

Run: `npm run test:e2e`
Expected: PASS (todos os testes de `auth.spec.ts` e `farm.spec.ts`). Falhou → skill `diagnosing-bugs` antes de mudar código.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test: robô de ponta a ponta da etapa 2"
```

---

## Fim da Etapa 2

- [ ] `npm test`, `npm run test:e2e` e `npm run test:live` passam; `npm run build` sem erros.
- [ ] Mostrar ao usuário o Painel, o MyFarm e o Clima funcionando.
- [ ] Escrever o plano da Etapa 3.
