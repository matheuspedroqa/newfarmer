# NewFarmer Etapa 1 — Contas, idiomas e tema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projeto Next.js funcionando com cadastro (com tipo de clima descoberto pela cidade), login com bloqueio por tentativas, sessão, recuperação de senha via caixa de e-mail de teste, alternância PT/EN e claro/noturno, e um Painel provisório protegido.

**Architecture:** Toda regra de negócio fica em `src/server/*` como funções simples que recebem o banco (`Db`) e, quando precisam, um `WeatherProvider` ou `Mailer` — assim são testadas com SQLite em memória e provedores falsos. As páginas e server actions do Next.js são cascas finas que validam com `zod`, chamam essas funções e cuidam de cookies/redirecionamento.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, next-intl 4, better-sqlite3 12, bcryptjs 3, zod 3, Vitest, Playwright, Open-Meteo.

## Global Constraints

- Somente computador; telas funcionam a partir de 1024 px de largura.
- Todo texto visível existe em `messages/pt.json` e `messages/en.json`; padrão `pt`.
- Senhas: mínimo 8, máximo 128 caracteres; bcrypt custo 12 (custo 4 só quando `NODE_ENV === "test"`).
- Sessão: cookie `nf_session`, `httpOnly`, `sameSite=lax`, `secure` em produção, 30 dias; no banco só o SHA-256 do token.
- Link de recuperação: 1 hora, uso único; pedir recuperação de e-mail inexistente dá a mesma resposta.
- Bloqueio: 5 falhas de login em 15 min para o mesmo e-mail → 15 min bloqueado.
- Mensagem de login inválido nunca diz se o erro foi no e-mail ou na senha.
- `/dev/inbox` só existe quando `NODE_ENV !== "production"`.
- Tempos no banco em milissegundos (INTEGER, `Date.now()`).
- Zonas de clima no código: `tropical | subtropical | temperate | semiarid | cold`; hemisfério `south | north`.
- Cookies de preferência: `nf_locale` (`pt|en`) e `nf_theme` (`light|dark`), 1 ano.

## Pré-requisito: Etapa 0 (protótipos)

Antes da Task 9, o usuário escolhe um dos protótipos visuais. As cores escolhidas substituem os valores das variáveis CSS em `src/app/globals.css` (Task 9, Step 3) e o fundo da tela de login (Task 10). A estrutura das tarefas não muda.

## Estrutura de arquivos

```
messages/pt.json, messages/en.json      textos PT/EN
src/lib/cookies.ts                      nomes de cookies (sem dependências, usado no middleware)
src/lib/validation.ts                   esquemas zod + toFieldErrors
src/i18n/locales.ts                     Locale, Theme, resolveLocale, resolveTheme
src/i18n/request.ts                     configuração do next-intl (lê cookie)
src/server/db.ts                        openDb, getDb, esquema SQL
src/server/tokens.ts                    newToken, hashToken
src/server/climate.ts                   classifyClimate, hemisphereFor, estimateZoneByLatitude, normalsFromDaily
src/server/weather/types.ts             WeatherProvider, CityResult, ClimateNormals
src/server/weather/open-meteo.ts        provedor real
src/server/weather/fake.ts              provedor falso (testes e E2E)
src/server/weather/index.ts             getWeatherProvider()
src/server/accounts.ts                  createUser, verifyCredentials, getUserById, setPassword
src/server/sessions.ts                  createSession, getSessionUser, deleteSession
src/server/mailer.ts                    Mailer, createDevInboxMailer, listDevEmails
src/server/password-reset.ts            requestPasswordReset, resetPassword
src/server/registration.ts              resolveClimate, registerUser, refreshEstimatedClimate
src/server/preferences.ts               setPreferences
src/server/current-user.ts              getCurrentUser, cookies de sessão
src/app/actions/auth.ts                 signup/login/logout/forgot/reset actions
src/app/actions/preferences.ts          setLocaleAction, setThemeAction
src/app/api/cities/route.ts             autocompletar de cidades
src/components/*                        TopControls, LocaleToggle, ThemeToggle, CityPicker, FieldError, SubmitButton
src/app/(public)/...                    login, cadastro, recuperar, recuperar/[token], dev/inbox
src/app/(app)/...                       layout protegido, painel
src/middleware.ts                       redireciona para /login sem cookie de sessão
tests/unit, tests/integration, tests/e2e, tests/live
```

---

### Task 1: Base do projeto e ferramentas de teste

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.ts`, `vitest.live.config.ts`, `playwright.config.ts`, `tests/unit/smoke.test.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces: alias `@/*` → `src/*`; scripts `npm test`, `npm run test:e2e`, `npm run test:live`.

- [ ] **Step 1: Criar o projeto**

A pasta já contém `docs/` e `.git/`, que o create-next-app aceita.

```bash
npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```

Se recusar por pasta não vazia: criar em `../nf-tmp`, mover o conteúdo (exceto `.git`) para a raiz e apagar `../nf-tmp`.

- [ ] **Step 2: Instalar dependências**

```bash
npm i next-intl@4 better-sqlite3@12 bcryptjs@3 zod@3
npm i -D vitest@3 vite-tsconfig-paths@5 @types/better-sqlite3 @playwright/test
```

A instalação do navegador do Playwright (`npx playwright install chromium`) baixa um programa: avisar o usuário e pedir confirmação antes de rodar (fica para a Task 11).

- [ ] **Step 3: Configurar Vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
```

`vitest.live.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["tests/live/**/*.test.ts"], testTimeout: 30_000 },
});
```

Em `package.json`, `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:live": "vitest run --config vitest.live.config.ts"
```

Em `.gitignore`, acrescentar:
```
/data/
/test-results/
/playwright-report/
```

- [ ] **Step 4: Teste de fumaça**

`src/lib/cookies.ts`:
```ts
export const SESSION_COOKIE = "nf_session";
export const LOCALE_COOKIE = "nf_locale";
export const THEME_COOKIE = "nf_theme";
```

`tests/unit/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/cookies";

describe("ambiente de testes", () => {
  it("resolve o alias @/", () => {
    expect(SESSION_COOKIE).toBe("nf_session");
  });
});
```

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Conferir build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: base Next.js com Vitest e Playwright"
```

---

### Task 2: Banco de dados

**Files:**
- Create: `src/server/db.ts`, `tests/helpers/db.ts`
- Test: `tests/integration/db.test.ts`

**Interfaces:**
- Consumes: `src/lib/cookies.ts` (Task 1).
- Produces: `type Db`; `openDb(file: string): Db`; `getDb(): Db`; `testDb(): Db` (helper de teste).

- [ ] **Step 1: Teste**

`tests/helpers/db.ts`:
```ts
import { openDb, type Db } from "@/server/db";

export function testDb(): Db {
  return openDb(":memory:");
}
```

`tests/integration/db.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { testDb } from "../helpers/db";

describe("openDb", () => {
  it("cria todas as tabelas", () => {
    const db = testDb();
    const names = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[]
    ).map((r) => r.name);
    expect(names).toEqual([
      "dev_emails",
      "farm_animals",
      "farm_crops",
      "login_attempts",
      "password_reset_tokens",
      "sessions",
      "users",
      "weather_cache",
    ]);
  });

  it("recusa dois usuários com o mesmo e-mail", () => {
    const db = testDb();
    const insert = db.prepare(
      `INSERT INTO users (name, email, password_hash, city_label, latitude, longitude, country_code,
        climate_zone, hemisphere, created_at) VALUES ('A', 'a@x.com', 'h', 'C', 0, 0, 'BR', 'tropical', 'south', 0)`,
    );
    insert.run();
    expect(() => insert.run()).toThrow(/UNIQUE/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/integration/db.test.ts`
Expected: FAIL — `Cannot find module '@/server/db'`.

- [ ] **Step 3: Implementar**

`src/lib/cookies.ts`:
```ts
export const SESSION_COOKIE = "nf_session";
export const LOCALE_COOKIE = "nf_locale";
export const THEME_COOKIE = "nf_theme";
```

`src/server/db.ts`:
```ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city_label TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  country_code TEXT NOT NULL,
  climate_zone TEXT NOT NULL,
  climate_estimated INTEGER NOT NULL DEFAULT 0,
  hemisphere TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt',
  theme TEXT NOT NULL DEFAULT 'light',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email, attempted_at);
CREATE TABLE IF NOT EXISTS farm_animals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 100000),
  PRIMARY KEY (user_id, animal_id)
);
CREATE TABLE IF NOT EXISTS farm_crops (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  PRIMARY KEY (user_id, crop_id)
);
CREATE TABLE IF NOT EXISTS weather_cache (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dev_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export function openDb(file: string): Db {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

let shared: Db | undefined;

export function getDb(): Db {
  if (!shared) {
    const file = process.env.DATABASE_PATH ?? "data/newfarmer.db";
    fs.mkdirSync(path.dirname(file), { recursive: true });
    shared = openDb(file);
  }
  return shared;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/integration/db.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/db.ts tests/helpers/db.ts tests/integration/db.test.ts
git commit -m "feat: banco SQLite com esquema do MVP"
```

---

### Task 3: Tipo de clima e hemisfério (regras puras)

**Files:**
- Create: `src/server/climate.ts`
- Test: `tests/unit/climate.test.ts`

**Interfaces:**
- Produces:
  - `type ClimateZone = "tropical" | "subtropical" | "temperate" | "semiarid" | "cold"`
  - `type Hemisphere = "south" | "north"`
  - `interface ClimateNormals { monthlyMeanTemp: number[]; annualPrecip: number }` (12 médias em °C, chuva anual em mm)
  - `interface ResolvedClimate { zone: ClimateZone; estimated: boolean; hemisphere: Hemisphere }`
  - `classifyClimate(n: ClimateNormals): ClimateZone`
  - `hemisphereFor(latitude: number): Hemisphere`
  - `estimateZoneByLatitude(latitude: number): ClimateZone`
  - `normalsFromDaily(daily: { time: string[]; temperature_2m_mean: (number | null)[]; precipitation_sum: (number | null)[] }): ClimateNormals`

- [ ] **Step 1: Teste**

`tests/unit/climate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  classifyClimate,
  estimateZoneByLatitude,
  hemisphereFor,
  normalsFromDaily,
} from "@/server/climate";

const flat = (t: number) => Array(12).fill(t);

describe("classifyClimate", () => {
  it("tropical: mês mais frio com 18 °C ou mais", () => {
    expect(classifyClimate({ monthlyMeanTemp: flat(26), annualPrecip: 1500 })).toBe("tropical");
  });

  it("semiárido: pouca chuva para a temperatura, mesmo sendo quente", () => {
    // limite = 20 × 26 + 140 = 660 mm
    expect(classifyClimate({ monthlyMeanTemp: flat(26), annualPrecip: 500 })).toBe("semiarid");
  });

  it("subtropical: mês mais frio entre 8 e 18 °C (perfil de Curitiba)", () => {
    const curitiba = [21, 21, 20, 17, 15, 13, 13, 14, 15, 17, 19, 20];
    expect(classifyClimate({ monthlyMeanTemp: curitiba, annualPrecip: 1400 })).toBe("subtropical");
  });

  it("temperado: mês mais frio entre -3 e 8 °C (perfil de Paris)", () => {
    const paris = [5, 6, 9, 12, 16, 19, 21, 21, 17, 13, 8, 5];
    expect(classifyClimate({ monthlyMeanTemp: paris, annualPrecip: 640 })).toBe("temperate");
  });

  it("frio: mês mais frio com -3 °C ou menos", () => {
    const cold = [-10, -8, -2, 5, 12, 17, 20, 18, 12, 5, -2, -8];
    expect(classifyClimate({ monthlyMeanTemp: cold, annualPrecip: 600 })).toBe("cold");
  });

  it("limites exatos: 18 → tropical, 8 → subtropical, -3 → frio", () => {
    expect(classifyClimate({ monthlyMeanTemp: [18, ...flat(25).slice(1)], annualPrecip: 3000 })).toBe("tropical");
    expect(classifyClimate({ monthlyMeanTemp: [8, ...flat(20).slice(1)], annualPrecip: 3000 })).toBe("subtropical");
    expect(classifyClimate({ monthlyMeanTemp: [-3, ...flat(15).slice(1)], annualPrecip: 3000 })).toBe("cold");
  });

  it("recusa dados sem 12 meses", () => {
    expect(() => classifyClimate({ monthlyMeanTemp: [20, 20], annualPrecip: 1000 })).toThrow();
  });
});

describe("hemisphereFor", () => {
  it("latitude negativa é hemisfério sul", () => expect(hemisphereFor(-22.9)).toBe("south"));
  it("latitude positiva é hemisfério norte", () => expect(hemisphereFor(38.7)).toBe("north"));
  it("linha do equador conta como norte", () => expect(hemisphereFor(0)).toBe("north"));
});

describe("estimateZoneByLatitude", () => {
  it.each([
    [-1, "tropical"],
    [23.4, "tropical"],
    [23.5, "subtropical"],
    [-30, "subtropical"],
    [-45, "temperate"],
    [54.9, "temperate"],
    [60, "cold"],
  ] as const)("latitude %s → %s", (lat, zone) => {
    expect(estimateZoneByLatitude(lat)).toBe(zone);
  });
});

describe("normalsFromDaily", () => {
  it("faz média por mês e divide a chuva pelo número de anos, ignorando dias sem dado", () => {
    const time: string[] = [];
    const temp: (number | null)[] = [];
    const rain: (number | null)[] = [];
    for (const year of [2020, 2021]) {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        time.push(`${year}-${mm}-01`, `${year}-${mm}-02`);
        temp.push(m, null);
        rain.push(10, null);
      }
    }
    const n = normalsFromDaily({ time, temperature_2m_mean: temp, precipitation_sum: rain });
    expect(n.monthlyMeanTemp).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(n.annualPrecip).toBe(120);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/climate.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`src/server/climate.ts`:
```ts
export type ClimateZone = "tropical" | "subtropical" | "temperate" | "semiarid" | "cold";
export type Hemisphere = "south" | "north";

export interface ClimateNormals {
  monthlyMeanTemp: number[];
  annualPrecip: number;
}

export interface ResolvedClimate {
  zone: ClimateZone;
  estimated: boolean;
  hemisphere: Hemisphere;
}

export function classifyClimate({ monthlyMeanTemp, annualPrecip }: ClimateNormals): ClimateZone {
  if (monthlyMeanTemp.length !== 12) throw new Error("classifyClimate precisa de 12 médias mensais");
  const coldest = Math.min(...monthlyMeanTemp);
  const annualMean = monthlyMeanTemp.reduce((a, b) => a + b, 0) / 12;

  if (annualPrecip < 20 * annualMean + 140) return "semiarid";
  if (coldest >= 18) return "tropical";
  if (coldest <= -3) return "cold";
  if (coldest >= 8) return "subtropical";
  return "temperate";
}

export function hemisphereFor(latitude: number): Hemisphere {
  return latitude < 0 ? "south" : "north";
}

export function estimateZoneByLatitude(latitude: number): ClimateZone {
  const abs = Math.abs(latitude);
  if (abs < 23.5) return "tropical";
  if (abs < 35) return "subtropical";
  if (abs < 55) return "temperate";
  return "cold";
}

export function normalsFromDaily(daily: {
  time: string[];
  temperature_2m_mean: (number | null)[];
  precipitation_sum: (number | null)[];
}): ClimateNormals {
  const tempSum = Array(12).fill(0);
  const tempCount = Array(12).fill(0);
  let rainTotal = 0;
  const years = new Set<string>();

  daily.time.forEach((day, i) => {
    years.add(day.slice(0, 4));
    const month = Number(day.slice(5, 7)) - 1;
    const t = daily.temperature_2m_mean[i];
    if (t !== null && t !== undefined) {
      tempSum[month] += t;
      tempCount[month] += 1;
    }
    rainTotal += daily.precipitation_sum[i] ?? 0;
  });

  return {
    monthlyMeanTemp: tempSum.map((s, m) => (tempCount[m] ? s / tempCount[m] : NaN)),
    annualPrecip: rainTotal / years.size,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/climate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/climate.ts tests/unit/climate.test.ts
git commit -m "feat: classificação do tipo de clima e hemisfério"
```

---

### Task 4: Validações dos formulários

**Files:**
- Create: `src/lib/validation.ts`
- Test: `tests/unit/validation.test.ts`

**Interfaces:**
- Produces: `citySchema`, `type CityChoice = { label: string; latitude: number; longitude: number; countryCode: string }`, `signupSchema`, `type SignupInput`, `loginSchema`, `forgotSchema`, `resetSchema`, `toFieldErrors(error: ZodError): Record<string, string>`. As mensagens de erro são **chaves** do namespace `errors` de `messages/*.json`: `required`, `tooLong`, `emailInvalid`, `passwordTooShort`, `passwordTooLong`, `passwordsDontMatch`, `cityRequired`.

- [ ] **Step 1: Teste**

`tests/unit/validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loginSchema, resetSchema, signupSchema, toFieldErrors } from "@/lib/validation";

const city = { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" };
const valid = { name: "Ana", email: "ana@exemplo.com", password: "segredo123", confirmPassword: "segredo123", city };

function errorsOf(schema: typeof signupSchema | typeof loginSchema | typeof resetSchema, data: unknown) {
  const r = schema.safeParse(data);
  if (r.success) return {};
  return toFieldErrors(r.error);
}

describe("signupSchema", () => {
  it("aceita dados válidos e normaliza o e-mail", () => {
    const r = signupSchema.parse({ ...valid, email: "  Ana@Exemplo.COM " });
    expect(r.email).toBe("ana@exemplo.com");
  });

  it("campo vazio → required", () => {
    expect(errorsOf(signupSchema, { ...valid, name: "  " }).name).toBe("required");
    expect(errorsOf(signupSchema, { ...valid, email: "" }).email).toBe("required");
    expect(errorsOf(signupSchema, { ...valid, password: "", confirmPassword: "" }).password).toBe("required");
  });

  it("e-mail inválido", () => {
    expect(errorsOf(signupSchema, { ...valid, email: "ana@" }).email).toBe("emailInvalid");
  });

  it("senha curta e senha longa", () => {
    expect(errorsOf(signupSchema, { ...valid, password: "1234567", confirmPassword: "1234567" }).password).toBe(
      "passwordTooShort",
    );
    const long = "a".repeat(129);
    expect(errorsOf(signupSchema, { ...valid, password: long, confirmPassword: long }).password).toBe(
      "passwordTooLong",
    );
  });

  it("senhas diferentes → erro na confirmação", () => {
    expect(errorsOf(signupSchema, { ...valid, confirmPassword: "outra-senha" }).confirmPassword).toBe(
      "passwordsDontMatch",
    );
  });

  it("cidade não escolhida → cityRequired", () => {
    expect(errorsOf(signupSchema, { ...valid, city: null }).city).toBe("cityRequired");
  });

  it("nome com mais de 80 letras → tooLong", () => {
    expect(errorsOf(signupSchema, { ...valid, name: "a".repeat(81) }).name).toBe("tooLong");
  });
});

describe("loginSchema", () => {
  it("senha vazia → required", () => {
    expect(errorsOf(loginSchema, { email: "ana@exemplo.com", password: "" }).password).toBe("required");
  });
});

describe("resetSchema", () => {
  it("senhas diferentes → erro na confirmação", () => {
    expect(
      errorsOf(resetSchema, { token: "t", password: "segredo123", confirmPassword: "segredo124" }).confirmPassword,
    ).toBe("passwordsDontMatch");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/validation.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`src/lib/validation.ts`:
```ts
import { z, type ZodError } from "zod";

const email = z.string().trim().toLowerCase().min(1, "required").email("emailInvalid");
const newPassword = z.string().min(1, "required").min(8, "passwordTooShort").max(128, "passwordTooLong");

export const citySchema = z.object(
  {
    label: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    countryCode: z.string().min(2).max(3),
  },
  { required_error: "cityRequired", invalid_type_error: "cityRequired" },
);
export type CityChoice = z.infer<typeof citySchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(80, "tooLong"),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    city: citySchema,
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1, "required") });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });

export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    result[field] ??= issue.message;
  }
  return result;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts tests/unit/validation.test.ts
git commit -m "feat: validações dos formulários de conta"
```

---

### Task 5: Contas — criar usuário e conferir login com bloqueio

**Files:**
- Create: `src/server/accounts.ts`, `tests/helpers/users.ts`
- Test: `tests/integration/accounts.test.ts`

**Interfaces:**
- Consumes: `Db` (Task 2); `CityChoice` (Task 4); `ResolvedClimate`, `ClimateZone`, `Hemisphere` (Task 3).
- Produces:
  - `class EmailTakenError extends Error`
  - `interface NewUser { name: string; email: string; password: string; city: CityChoice; climate: ResolvedClimate }`
  - `interface User { id: number; name: string; email: string; cityLabel: string; latitude: number; longitude: number; countryCode: string; climateZone: ClimateZone; climateEstimated: boolean; hemisphere: Hemisphere; locale: Locale; theme: Theme }`
  - `createUser(db: Db, user: NewUser, now?: number): Promise<number>`
  - `getUserById(db: Db, id: number): User | null`
  - `type LoginResult = { ok: true; userId: number } | { ok: false; reason: "invalid" | "locked" }`
  - `verifyCredentials(db: Db, email: string, password: string, now?: number): Promise<LoginResult>`
  - `setPassword(db: Db, userId: number, password: string): Promise<void>`
  - `MAX_FAILED_LOGINS = 5`, `LOCK_WINDOW_MS = 900000`
  - Helper de teste: `makeUser(db: Db, overrides?: Partial<NewUser>): Promise<number>` com e-mail `ana@exemplo.com` e senha `segredo123` por padrão.
- Também cria `src/i18n/locales.ts` (sem dependências) com `type Locale = "pt" | "en"`, `type Theme = "light" | "dark"`, `LOCALES`, `resolveLocale`, `resolveTheme`.

- [ ] **Step 1: Teste**

`tests/helpers/users.ts`:
```ts
import { createUser, type NewUser } from "@/server/accounts";
import type { Db } from "@/server/db";

export const DEFAULT_PASSWORD = "segredo123";

export function makeUser(db: Db, overrides: Partial<NewUser> = {}): Promise<number> {
  return createUser(db, {
    name: "Ana",
    email: "ana@exemplo.com",
    password: DEFAULT_PASSWORD,
    city: { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" },
    climate: { zone: "subtropical", estimated: false, hemisphere: "south" },
    ...overrides,
  });
}
```

`tests/integration/accounts.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  EmailTakenError,
  LOCK_WINDOW_MS,
  getUserById,
  setPassword,
  verifyCredentials,
} from "@/server/accounts";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

describe("createUser", () => {
  it("guarda o usuário com a senha embaralhada", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as { password_hash: string };
    expect(row.password_hash).not.toContain(DEFAULT_PASSWORD);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(getUserById(db, id)).toMatchObject({
      name: "Ana",
      email: "ana@exemplo.com",
      cityLabel: "Campinas, São Paulo, Brasil",
      climateZone: "subtropical",
      climateEstimated: false,
      hemisphere: "south",
      locale: "pt",
      theme: "light",
    });
  });

  it("e-mail repetido gera EmailTakenError, mesmo com letras maiúsculas", async () => {
    const db = testDb();
    await makeUser(db);
    await expect(makeUser(db, { email: "ANA@exemplo.com" })).rejects.toBeInstanceOf(EmailTakenError);
  });
});

describe("verifyCredentials", () => {
  it("senha certa entra", async () => {
    const db = testDb();
    const id = await makeUser(db);
    expect(await verifyCredentials(db, "Ana@Exemplo.com", DEFAULT_PASSWORD)).toEqual({ ok: true, userId: id });
  });

  it("senha errada ou e-mail desconhecido dão o mesmo resultado", async () => {
    const db = testDb();
    await makeUser(db);
    expect(await verifyCredentials(db, "ana@exemplo.com", "errada123")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials(db, "nao@existe.com", DEFAULT_PASSWORD)).toEqual({ ok: false, reason: "invalid" });
  });

  it("5 erros seguidos bloqueiam por 15 minutos, mesmo com a senha certa", async () => {
    const db = testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    expect(await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 10)).toEqual({
      ok: false,
      reason: "locked",
    });
    const later = t0 + LOCK_WINDOW_MS + 10;
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, later)).ok).toBe(true);
  });

  it("um login certo zera a contagem de erros", async () => {
    const db = testDb();
    await makeUser(db);
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 5);
    for (let i = 6; i < 10; i++) await verifyCredentials(db, "ana@exemplo.com", "errada", t0 + i);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD, t0 + 11)).ok).toBe(true);
  });
});

describe("setPassword", () => {
  it("troca a senha", async () => {
    const db = testDb();
    const id = await makeUser(db);
    await setPassword(db, id, "nova-senha-1");
    expect((await verifyCredentials(db, "ana@exemplo.com", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/integration/accounts.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`src/i18n/locales.ts`:
```ts
export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export type Theme = "light" | "dark";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "pt";
}

export function resolveTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
```

`src/server/accounts.ts`:
```ts
import bcrypt from "bcryptjs";
import type { CityChoice } from "@/lib/validation";
import { resolveLocale, resolveTheme, type Locale, type Theme } from "@/i18n/locales";
import type { ClimateZone, Hemisphere, ResolvedClimate } from "./climate";
import type { Db } from "./db";

const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;
// Compared against when the e-mail does not exist, so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

export const MAX_FAILED_LOGINS = 5;
export const LOCK_WINDOW_MS = 15 * 60_000;

export class EmailTakenError extends Error {
  constructor() {
    super("E-mail already registered");
  }
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  city: CityChoice;
  climate: ResolvedClimate;
}

export interface User {
  id: number;
  name: string;
  email: string;
  cityLabel: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  climateZone: ClimateZone;
  climateEstimated: boolean;
  hemisphere: Hemisphere;
  locale: Locale;
  theme: Theme;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  city_label: string;
  latitude: number;
  longitude: number;
  country_code: string;
  climate_zone: ClimateZone;
  climate_estimated: number;
  hemisphere: Hemisphere;
  locale: string;
  theme: string;
}

export async function createUser(db: Db, user: NewUser, now = Date.now()): Promise<number> {
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
  try {
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, city_label, latitude, longitude, country_code,
          climate_zone, climate_estimated, hemisphere, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.name.trim(),
        user.email.trim().toLowerCase(),
        passwordHash,
        user.city.label,
        user.city.latitude,
        user.city.longitude,
        user.city.countryCode,
        user.climate.zone,
        user.climate.estimated ? 1 : 0,
        user.climate.hemisphere,
        now,
      );
    return Number(result.lastInsertRowid);
  } catch (error) {
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") throw new EmailTakenError();
    throw error;
  }
}

export function getUserById(db: Db, id: number): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cityLabel: row.city_label,
    latitude: row.latitude,
    longitude: row.longitude,
    countryCode: row.country_code,
    climateZone: row.climate_zone,
    climateEstimated: row.climate_estimated === 1,
    hemisphere: row.hemisphere,
    locale: resolveLocale(row.locale),
    theme: resolveTheme(row.theme),
  };
}

export type LoginResult = { ok: true; userId: number } | { ok: false; reason: "invalid" | "locked" };

export async function verifyCredentials(
  db: Db,
  email: string,
  password: string,
  now = Date.now(),
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  if (isLocked(db, normalized, now)) return { ok: false, reason: "locked" };

  const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(normalized) as
    | { id: number; password_hash: string }
    | undefined;
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  const ok = Boolean(row) && matches;

  db.prepare("INSERT INTO login_attempts (email, attempted_at, success) VALUES (?, ?, ?)").run(
    normalized,
    now,
    ok ? 1 : 0,
  );
  return ok ? { ok: true, userId: row!.id } : { ok: false, reason: "invalid" };
}

function isLocked(db: Db, email: string, now: number): boolean {
  const lastSuccess = db
    .prepare("SELECT MAX(attempted_at) AS t FROM login_attempts WHERE email = ? AND success = 1")
    .get(email) as { t: number | null };
  const since = Math.max(now - LOCK_WINDOW_MS, lastSuccess.t ?? 0);
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND success = 0 AND attempted_at > ?")
    .get(email, since) as { n: number };
  return n >= MAX_FAILED_LOGINS;
}

export async function setPassword(db: Db, userId: number, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/integration/accounts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/accounts.ts src/i18n/locales.ts tests/helpers/users.ts tests/integration/accounts.test.ts
git commit -m "feat: criação de conta e login com bloqueio por tentativas"
```

---

### Task 6: Sessões

**Files:**
- Create: `src/server/tokens.ts`, `src/server/sessions.ts`
- Test: `tests/integration/sessions.test.ts`

**Interfaces:**
- Consumes: `Db`, `User`, `getUserById` (Task 5).
- Produces: `newToken(): string`; `hashToken(token: string): string`; `SESSION_TTL_MS`; `createSession(db, userId, now?): string` (token cru); `getSessionUser(db, token, now?): User | null`; `deleteSession(db, token): void`; `deleteUserSessions(db, userId): void`.

- [ ] **Step 1: Teste**

`tests/integration/sessions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  createSession,
  deleteSession,
  deleteUserSessions,
  getSessionUser,
} from "@/server/sessions";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("sessões", () => {
  it("cria uma sessão e encontra o usuário pelo token", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const token = createSession(db, id, 0);
    expect(getSessionUser(db, token, 1)?.id).toBe(id);
  });

  it("não guarda o token em texto no banco", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db));
    const row = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(row.token_hash).not.toBe(token);
  });

  it("sessão vencida não vale e é apagada", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db), 0);
    expect(getSessionUser(db, token, SESSION_TTL_MS + 1)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("token desconhecido ou vazio não vale", () => {
    const db = testDb();
    expect(getSessionUser(db, "inventado")).toBeNull();
    expect(getSessionUser(db, "")).toBeNull();
  });

  it("sair apaga a sessão", async () => {
    const db = testDb();
    const token = createSession(db, await makeUser(db));
    deleteSession(db, token);
    expect(getSessionUser(db, token)).toBeNull();
  });

  it("deleteUserSessions apaga todas as sessões do usuário", async () => {
    const db = testDb();
    const id = await makeUser(db);
    const a = createSession(db, id);
    const b = createSession(db, id);
    deleteUserSessions(db, id);
    expect(getSessionUser(db, a)).toBeNull();
    expect(getSessionUser(db, b)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/integration/sessions.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

`src/server/tokens.ts`:
```ts
import { createHash, randomBytes } from "node:crypto";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

`src/server/sessions.ts`:
```ts
import { getUserById, type User } from "./accounts";
import type { Db } from "./db";
import { hashToken, newToken } from "./tokens";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export function createSession(db: Db, userId: number, now = Date.now()): string {
  const token = newToken();
  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    userId,
    hashToken(token),
    now + SESSION_TTL_MS,
  );
  return token;
}

export function getSessionUser(db: Db, token: string, now = Date.now()): User | null {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash) as
    | { user_id: number; expires_at: number }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= now) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return getUserById(db, row.user_id);
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: number): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/integration/sessions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/tokens.ts src/server/sessions.ts tests/integration/sessions.test.ts
git commit -m "feat: sessões com token embaralhado e validade de 30 dias"
```

---

### Task 7: Recuperação de senha e caixa de e-mail de teste

**Files:**
- Create: `src/server/mailer.ts`, `src/server/password-reset.ts`, `messages/pt.json`, `messages/en.json`
- Test: `tests/integration/password-reset.test.ts`

**Interfaces:**
- Consumes: `Db`, `setPassword` (Task 5), `deleteUserSessions` (Task 6), `newToken`/`hashToken` (Task 6), `Locale` (Task 5).
- Produces:
  - `interface MailMessage { to: string; subject: string; html: string }`
  - `interface Mailer { send(message: MailMessage): Promise<void> }`
  - `createDevInboxMailer(db: Db): Mailer`
  - `listDevEmails(db: Db): { id: number; to: string; subject: string; html: string; createdAt: number }[]` (mais recente primeiro)
  - `RESET_TTL_MS = 3600000`
  - `requestPasswordReset(db, mailer, input: { email: string; baseUrl: string; locale: Locale }, now?): Promise<void>`
  - `resetPassword(db, input: { token: string; password: string }, now?): Promise<"ok" | "expired">`
  - Arquivos `messages/*.json` completos para a Etapa 1 (usados também nas Tasks 9–10).

- [ ] **Step 1: Criar os textos PT/EN**

`messages/pt.json`:
```json
{
  "app": { "name": "NewFarmer", "tagline": "Seu guia para a vida no campo" },
  "toggles": { "language": "Idioma", "themeLight": "Ativar modo claro", "themeDark": "Ativar modo noturno" },
  "auth": {
    "name": "Nome",
    "email": "E-mail",
    "password": "Senha",
    "confirmPassword": "Confirmar senha",
    "city": "Cidade",
    "cityPlaceholder": "Digite sua cidade",
    "citySearching": "Buscando...",
    "loginTitle": "Bem-vindo de volta",
    "login": "Entrar",
    "createAccount": "Criar conta",
    "signupTitle": "Crie sua conta",
    "haveAccount": "Já tem conta? Entrar",
    "forgot": "Esqueci minha senha",
    "forgotTitle": "Recuperar senha",
    "forgotHelp": "Informe seu e-mail e enviaremos um link para criar uma nova senha.",
    "sendLink": "Enviar link",
    "forgotSent": "Se houver uma conta com esse e-mail, enviamos um link. Ele vale por 1 hora.",
    "resetTitle": "Nova senha",
    "savePassword": "Salvar nova senha",
    "resetDone": "Senha alterada. Você já pode entrar.",
    "backToLogin": "Voltar para a entrada",
    "logout": "Sair",
    "sending": "Enviando..."
  },
  "errors": {
    "required": "Preencha este campo",
    "tooLong": "Texto longo demais",
    "emailInvalid": "Digite um e-mail válido",
    "passwordTooShort": "A senha precisa ter pelo menos 8 caracteres",
    "passwordTooLong": "A senha pode ter no máximo 128 caracteres",
    "passwordsDontMatch": "As senhas não são iguais",
    "cityRequired": "Escolha uma cidade da lista",
    "cityNotFound": "Não encontramos essa cidade. Tente com o nome do estado ou país",
    "citySearchFailed": "Não foi possível buscar cidades agora. Tente de novo.",
    "emailTaken": "Este e-mail já tem uma conta. Quer entrar?",
    "invalidCredentials": "E-mail ou senha incorretos",
    "locked": "Muitas tentativas. Tente de novo em 15 minutos.",
    "linkExpired": "Este link expirou. Peça um novo",
    "generic": "Algo deu errado. Tente de novo."
  },
  "climate": {
    "tropical": "Tropical",
    "subtropical": "Subtropical",
    "temperate": "Temperado",
    "semiarid": "Semiárido",
    "cold": "Frio",
    "estimated": "estimado",
    "south": "Hemisfério sul",
    "north": "Hemisfério norte"
  },
  "nav": { "dashboard": "Painel" },
  "dashboard": { "hello": "Olá, {name}!", "comingSoon": "Em breve: seus animais, plantações e a previsão do tempo aparecem aqui." },
  "email": {
    "resetSubject": "Recupere sua senha do NewFarmer",
    "resetBody": "<p>Olá, {name}!</p><p>Clique no link abaixo para criar uma nova senha. Ele vale por 1 hora.</p><p><a href=\"{link}\">{link}</a></p><p>Se você não pediu isso, ignore este e-mail.</p>"
  },
  "devInbox": { "title": "Caixa de e-mail de teste", "help": "Os e-mails do sistema aparecem aqui enquanto ele roda no seu computador.", "empty": "Nenhum e-mail enviado ainda.", "to": "Para" }
}
```

`messages/en.json`:
```json
{
  "app": { "name": "NewFarmer", "tagline": "Your guide to country life" },
  "toggles": { "language": "Language", "themeLight": "Switch to light mode", "themeDark": "Switch to dark mode" },
  "auth": {
    "name": "Name",
    "email": "E-mail",
    "password": "Password",
    "confirmPassword": "Confirm password",
    "city": "City",
    "cityPlaceholder": "Type your city",
    "citySearching": "Searching...",
    "loginTitle": "Welcome back",
    "login": "Sign in",
    "createAccount": "Create account",
    "signupTitle": "Create your account",
    "haveAccount": "Already have an account? Sign in",
    "forgot": "Forgot my password",
    "forgotTitle": "Recover password",
    "forgotHelp": "Enter your e-mail and we will send you a link to create a new password.",
    "sendLink": "Send link",
    "forgotSent": "If there is an account with that e-mail, we sent a link. It is valid for 1 hour.",
    "resetTitle": "New password",
    "savePassword": "Save new password",
    "resetDone": "Password changed. You can sign in now.",
    "backToLogin": "Back to sign in",
    "logout": "Sign out",
    "sending": "Sending..."
  },
  "errors": {
    "required": "Please fill in this field",
    "tooLong": "Text is too long",
    "emailInvalid": "Enter a valid e-mail",
    "passwordTooShort": "Password must have at least 8 characters",
    "passwordTooLong": "Password can have at most 128 characters",
    "passwordsDontMatch": "Passwords do not match",
    "cityRequired": "Choose a city from the list",
    "cityNotFound": "We could not find that city. Try adding the state or country",
    "citySearchFailed": "Could not search cities right now. Please try again.",
    "emailTaken": "This e-mail already has an account. Want to sign in?",
    "invalidCredentials": "Incorrect e-mail or password",
    "locked": "Too many attempts. Try again in 15 minutes.",
    "linkExpired": "This link has expired. Request a new one",
    "generic": "Something went wrong. Please try again."
  },
  "climate": {
    "tropical": "Tropical",
    "subtropical": "Subtropical",
    "temperate": "Temperate",
    "semiarid": "Semi-arid",
    "cold": "Cold",
    "estimated": "estimated",
    "south": "Southern hemisphere",
    "north": "Northern hemisphere"
  },
  "nav": { "dashboard": "Dashboard" },
  "dashboard": { "hello": "Hello, {name}!", "comingSoon": "Coming soon: your animals, crops and weather forecast will show up here." },
  "email": {
    "resetSubject": "Recover your NewFarmer password",
    "resetBody": "<p>Hello, {name}!</p><p>Click the link below to create a new password. It is valid for 1 hour.</p><p><a href=\"{link}\">{link}</a></p><p>If you did not request this, ignore this e-mail.</p>"
  },
  "devInbox": { "title": "Test inbox", "help": "System e-mails show up here while it runs on your computer.", "empty": "No e-mails sent yet.", "to": "To" }
}
```

- [ ] **Step 2: Teste**

`tests/integration/password-reset.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { verifyCredentials } from "@/server/accounts";
import { createDevInboxMailer, listDevEmails, type MailMessage, type Mailer } from "@/server/mailer";
import { RESET_TTL_MS, requestPasswordReset, resetPassword } from "@/server/password-reset";
import { createSession, getSessionUser } from "@/server/sessions";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

function captureMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  return { sent, mailer };
}

function tokenFrom(message: MailMessage): string {
  const match = message.html.match(/\/recuperar\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("link não encontrado no e-mail");
  return match[1];
}

const base = { baseUrl: "http://localhost:3000", locale: "pt" as const };

describe("requestPasswordReset", () => {
  it("envia um e-mail com link para quem tem conta", async () => {
    const db = testDb();
    await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, email: "ANA@exemplo.com" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@exemplo.com");
    expect(sent[0].subject).toBe("Recupere sua senha do NewFarmer");
    expect(sent[0].html).toContain("http://localhost:3000/recuperar/");
  });

  it("usa o idioma pedido", async () => {
    const db = testDb();
    await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, email: "ana@exemplo.com", locale: "en" });
    expect(sent[0].subject).toBe("Recover your NewFarmer password");
  });

  it("não envia nada nem dá erro para e-mail sem conta", async () => {
    const db = testDb();
    const { sent, mailer } = captureMailer();
    await expect(requestPasswordReset(db, mailer, { ...base, email: "nao@existe.com" })).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("protege o e-mail contra nomes com código", async () => {
    const db = testDb();
    await makeUser(db, { name: "<script>alert(1)</script>" });
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, email: "ana@exemplo.com" });
    expect(sent[0].html).not.toContain("<script>");
    expect(sent[0].html).toContain("&lt;script&gt;");
  });
});

describe("resetPassword", () => {
  async function setup() {
    const db = testDb();
    const userId = await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, email: "ana@exemplo.com" }, 0);
    return { db, userId, token: tokenFrom(sent[0]) };
  }

  it("troca a senha com um link válido", async () => {
    const { db, token } = await setup();
    expect(await resetPassword(db, { token, password: "nova-senha-1" }, 1000)).toBe("ok");
    expect((await verifyCredentials(db, "ana@exemplo.com", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
  });

  it("o link só funciona uma vez", async () => {
    const { db, token } = await setup();
    await resetPassword(db, { token, password: "nova-senha-1" }, 1000);
    expect(await resetPassword(db, { token, password: "nova-senha-2" }, 2000)).toBe("expired");
  });

  it("o link vence depois de 1 hora", async () => {
    const { db, token } = await setup();
    expect(await resetPassword(db, { token, password: "nova-senha-1" }, RESET_TTL_MS + 1)).toBe("expired");
  });

  it("link inventado não funciona", async () => {
    const { db } = await setup();
    expect(await resetPassword(db, { token: "inventado", password: "nova-senha-1" })).toBe("expired");
  });

  it("trocar a senha desconecta as sessões abertas", async () => {
    const { db, userId, token } = await setup();
    const session = createSession(db, userId);
    await resetPassword(db, { token, password: "nova-senha-1" }, 1000);
    expect(getSessionUser(db, session)).toBeNull();
  });
});

describe("caixa de e-mail de teste", () => {
  it("guarda os e-mails e lista do mais novo para o mais antigo", async () => {
    const db = testDb();
    const mailer = createDevInboxMailer(db);
    await mailer.send({ to: "a@x.com", subject: "primeiro", html: "<p>1</p>" });
    await mailer.send({ to: "b@x.com", subject: "segundo", html: "<p>2</p>" });
    expect(listDevEmails(db).map((e) => e.subject)).toEqual(["segundo", "primeiro"]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/integration/password-reset.test.ts`
Expected: FAIL — módulos não existem.

- [ ] **Step 4: Implementar**

`src/server/mailer.ts`:
```ts
import type { Db } from "./db";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export function createDevInboxMailer(db: Db): Mailer {
  return {
    async send({ to, subject, html }) {
      db.prepare("INSERT INTO dev_emails (to_address, subject, body_html, created_at) VALUES (?, ?, ?, ?)").run(
        to,
        subject,
        html,
        Date.now(),
      );
    },
  };
}

export function listDevEmails(db: Db) {
  const rows = db
    .prepare("SELECT id, to_address, subject, body_html, created_at FROM dev_emails ORDER BY id DESC")
    .all() as { id: number; to_address: string; subject: string; body_html: string; created_at: number }[];
  return rows.map((r) => ({ id: r.id, to: r.to_address, subject: r.subject, html: r.body_html, createdAt: r.created_at }));
}
```

`src/server/password-reset.ts`:
```ts
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import type { Locale } from "@/i18n/locales";
import { setPassword } from "./accounts";
import type { Db } from "./db";
import type { Mailer } from "./mailer";
import { deleteUserSessions } from "./sessions";
import { hashToken, newToken } from "./tokens";

export const RESET_TTL_MS = 60 * 60_000;

const EMAIL_TEXTS = { pt: pt.email, en: en.email };

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function requestPasswordReset(
  db: Db,
  mailer: Mailer,
  input: { email: string; baseUrl: string; locale: Locale },
  now = Date.now(),
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const user = db.prepare("SELECT id, name FROM users WHERE email = ?").get(email) as
    | { id: number; name: string }
    | undefined;
  if (!user) return;

  const token = newToken();
  db.prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    user.id,
    hashToken(token),
    now + RESET_TTL_MS,
  );

  const texts = EMAIL_TEXTS[input.locale];
  const link = `${input.baseUrl}/recuperar/${token}`;
  await mailer.send({
    to: email,
    subject: texts.resetSubject,
    html: texts.resetBody.replaceAll("{name}", escapeHtml(user.name)).replaceAll("{link}", link),
  });
}

export async function resetPassword(
  db: Db,
  input: { token: string; password: string },
  now = Date.now(),
): Promise<"ok" | "expired"> {
  const row = db
    .prepare("SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?")
    .get(hashToken(input.token)) as
    | { id: number; user_id: number; expires_at: number; used_at: number | null }
    | undefined;
  if (!row || row.used_at !== null || row.expires_at <= now) return "expired";

  db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(now, row.id);
  await setPassword(db, row.user_id, input.password);
  deleteUserSessions(db, row.user_id);
  return "ok";
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/integration/password-reset.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add messages src/server/mailer.ts src/server/password-reset.ts tests/integration/password-reset.test.ts
git commit -m "feat: recuperação de senha com caixa de e-mail de teste"
```

---

### Task 8: Provedor de clima (Open-Meteo real e falso) e cadastro com tipo de clima

**Files:**
- Create: `src/server/weather/types.ts`, `src/server/weather/open-meteo.ts`, `src/server/weather/fake.ts`, `src/server/weather/index.ts`, `src/server/registration.ts`
- Test: `tests/integration/open-meteo.test.ts`, `tests/integration/registration.test.ts`, `tests/live/open-meteo.live.test.ts`

**Interfaces:**
- Consumes: `classifyClimate`, `estimateZoneByLatitude`, `hemisphereFor`, `normalsFromDaily`, `ClimateNormals`, `ResolvedClimate` (Task 3); `SignupInput`, `CityChoice` (Task 4); `createUser`, `EmailTakenError`, `getUserById` (Task 5); `Locale`.
- Produces:
  - `type CityResult = CityChoice`
  - `interface WeatherProvider { searchCities(query: string, locale: Locale): Promise<CityResult[]>; getClimateNormals(latitude: number, longitude: number): Promise<ClimateNormals> }` (a Etapa 2 acrescenta `getForecast`)
  - `createOpenMeteoProvider(fetchImpl?: typeof fetch, now?: () => Date): WeatherProvider`
  - `createFakeWeatherProvider(options?: { failNormals?: boolean }): WeatherProvider` — cidades: Campinas (tropical), Curitiba (subtropical), Lisboa (subtropical, norte)
  - `getWeatherProvider(): WeatherProvider` — falso se `process.env.WEATHER_FAKE === "1"`
  - `resolveClimate(provider, latitude, longitude): Promise<ResolvedClimate>`
  - `type RegisterResult = { ok: true; userId: number } | { ok: false; error: "emailTaken" }`
  - `registerUser(db, provider, input: SignupInput): Promise<RegisterResult>`
  - `refreshEstimatedClimate(db, provider, userId): Promise<void>`

- [ ] **Step 1: Teste do provedor real (com respostas gravadas)**

`tests/integration/open-meteo.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { createOpenMeteoProvider } from "@/server/weather/open-meteo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Open-Meteo: searchCities", () => {
  it("monta 'Cidade, Estado, País' e pede no idioma certo", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          { name: "Campinas", admin1: "São Paulo", country: "Brasil", country_code: "br", latitude: -22.9, longitude: -47.06 },
          { name: "Campinas", country: "Brasil", country_code: "BR", latitude: -10, longitude: -40 },
        ],
      }),
    );
    const provider = createOpenMeteoProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.searchCities("Campinas", "pt");
    expect(result).toEqual([
      { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" },
      { label: "Campinas, Brasil", latitude: -10, longitude: -40, countryCode: "BR" },
    ]);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.hostname).toBe("geocoding-api.open-meteo.com");
    expect(url.searchParams.get("name")).toBe("Campinas");
    expect(url.searchParams.get("language")).toBe("pt");
  });

  it("devolve lista vazia quando não acha nada", async () => {
    const provider = createOpenMeteoProvider((async () => jsonResponse({})) as unknown as typeof fetch);
    expect(await provider.searchCities("xyzxyz", "en")).toEqual([]);
  });

  it("dá erro quando o serviço falha", async () => {
    const provider = createOpenMeteoProvider((async () => jsonResponse({}, 500)) as unknown as typeof fetch);
    await expect(provider.searchCities("Campinas", "pt")).rejects.toThrow();
  });
});

describe("Open-Meteo: getClimateNormals", () => {
  it("pede os últimos 10 anos completos e calcula as médias", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        daily: {
          time: ["2016-01-01", "2016-07-01"],
          temperature_2m_mean: [25, 15],
          precipitation_sum: [800, 400],
        },
      }),
    );
    const provider = createOpenMeteoProvider(fetchMock as unknown as typeof fetch, () => new Date("2026-10-29"));
    const normals = await provider.getClimateNormals(-22.9, -47.06);
    expect(normals.monthlyMeanTemp[0]).toBe(25);
    expect(normals.monthlyMeanTemp[6]).toBe(15);
    expect(normals.annualPrecip).toBe(1200);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.hostname).toBe("archive-api.open-meteo.com");
    expect(url.searchParams.get("start_date")).toBe("2016-01-01");
    expect(url.searchParams.get("end_date")).toBe("2025-12-31");
  });
});
```

- [ ] **Step 2: Teste do cadastro**

`tests/integration/registration.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { SignupInput } from "@/lib/validation";
import { getUserById } from "@/server/accounts";
import { refreshEstimatedClimate, registerUser } from "@/server/registration";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";

const input = (city: SignupInput["city"]): SignupInput => ({
  name: "Ana",
  email: "ana@exemplo.com",
  password: "segredo123",
  confirmPassword: "segredo123",
  city,
});

describe("registerUser", () => {
  it("descobre o tipo de clima e o hemisfério pela cidade", async () => {
    const db = testDb();
    const provider = createFakeWeatherProvider();
    const [curitiba] = await provider.searchCities("Curitiba", "pt");
    const result = await registerUser(db, provider, input(curitiba));
    expect(result.ok).toBe(true);
    const user = getUserById(db, (result as { userId: number }).userId)!;
    expect(user).toMatchObject({ climateZone: "subtropical", climateEstimated: false, hemisphere: "south" });
  });

  it("hemisfério norte para Lisboa", async () => {
    const db = testDb();
    const provider = createFakeWeatherProvider();
    const [lisboa] = await provider.searchCities("Lisboa", "pt");
    const result = await registerUser(db, provider, input(lisboa));
    expect(getUserById(db, (result as { userId: number }).userId)!.hemisphere).toBe("north");
  });

  it("se o serviço de clima falhar, estima pela latitude e marca como estimado", async () => {
    const db = testDb();
    const provider = createFakeWeatherProvider({ failNormals: true });
    const [campinas] = await provider.searchCities("Campinas", "pt");
    const result = await registerUser(db, provider, input(campinas));
    expect(getUserById(db, (result as { userId: number }).userId)).toMatchObject({
      climateZone: "tropical",
      climateEstimated: true,
    });
  });

  it("e-mail repetido devolve emailTaken", async () => {
    const db = testDb();
    const provider = createFakeWeatherProvider();
    const [campinas] = await provider.searchCities("Campinas", "pt");
    await registerUser(db, provider, input(campinas));
    expect(await registerUser(db, provider, input(campinas))).toEqual({ ok: false, error: "emailTaken" });
  });
});

describe("refreshEstimatedClimate", () => {
  it("recalcula quando o clima estava estimado e o serviço voltou", async () => {
    const db = testDb();
    const [curitiba] = await createFakeWeatherProvider().searchCities("Curitiba", "pt");
    const result = await registerUser(db, createFakeWeatherProvider({ failNormals: true }), input(curitiba));
    const userId = (result as { userId: number }).userId;
    expect(getUserById(db, userId)).toMatchObject({ climateZone: "subtropical", climateEstimated: true });

    await refreshEstimatedClimate(db, createFakeWeatherProvider(), userId);
    expect(getUserById(db, userId)).toMatchObject({ climateZone: "subtropical", climateEstimated: false });
  });

  it("não faz nada se o serviço continuar fora", async () => {
    const db = testDb();
    const provider = createFakeWeatherProvider({ failNormals: true });
    const [campinas] = await provider.searchCities("Campinas", "pt");
    const userId = ((await registerUser(db, provider, input(campinas))) as { userId: number }).userId;
    await expect(refreshEstimatedClimate(db, provider, userId)).resolves.toBeUndefined();
    expect(getUserById(db, userId)!.climateEstimated).toBe(true);
  });
});
```

- [ ] **Step 3: Teste real (não roda com `npm test`)**

`tests/live/open-meteo.live.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createOpenMeteoProvider } from "@/server/weather/open-meteo";

describe("Open-Meteo de verdade", () => {
  const provider = createOpenMeteoProvider();

  it("encontra Campinas no Brasil", async () => {
    const cities = await provider.searchCities("Campinas", "pt");
    const br = cities.find((c) => c.countryCode === "BR" && c.label.includes("São Paulo"));
    expect(br).toBeDefined();
    expect(br!.latitude).toBeCloseTo(-22.9, 0);
  });

  it("devolve médias de 12 meses com chuva plausível", async () => {
    const normals = await provider.getClimateNormals(-22.9, -47.06);
    expect(normals.monthlyMeanTemp).toHaveLength(12);
    expect(normals.annualPrecip).toBeGreaterThan(500);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/integration/open-meteo.test.ts tests/integration/registration.test.ts`
Expected: FAIL — módulos não existem.

- [ ] **Step 5: Implementar**

`src/server/weather/types.ts`:
```ts
import type { CityChoice } from "@/lib/validation";
import type { Locale } from "@/i18n/locales";
import type { ClimateNormals } from "../climate";

export type CityResult = CityChoice;

export interface WeatherProvider {
  searchCities(query: string, locale: Locale): Promise<CityResult[]>;
  getClimateNormals(latitude: number, longitude: number): Promise<ClimateNormals>;
}
```

`src/server/weather/open-meteo.ts`:
```ts
import type { Locale } from "@/i18n/locales";
import { normalsFromDaily } from "../climate";
import type { CityResult, WeatherProvider } from "./types";

interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

export function createOpenMeteoProvider(
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): WeatherProvider {
  async function getJson<T>(url: URL): Promise<T> {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Open-Meteo respondeu ${response.status}`);
    return (await response.json()) as T;
  }

  return {
    async searchCities(query: string, locale: Locale): Promise<CityResult[]> {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", query);
      url.searchParams.set("count", "8");
      url.searchParams.set("language", locale);
      url.searchParams.set("format", "json");
      const body = await getJson<{ results?: GeocodingResult[] }>(url);
      return (body.results ?? []).map((r) => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        latitude: r.latitude,
        longitude: r.longitude,
        countryCode: r.country_code.toUpperCase(),
      }));
    },

    async getClimateNormals(latitude: number, longitude: number) {
      const endYear = now().getUTCFullYear() - 1;
      const url = new URL("https://archive-api.open-meteo.com/v1/archive");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("start_date", `${endYear - 9}-01-01`);
      url.searchParams.set("end_date", `${endYear}-12-31`);
      url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
      url.searchParams.set("timezone", "auto");
      const body = await getJson<{
        daily: { time: string[]; temperature_2m_mean: (number | null)[]; precipitation_sum: (number | null)[] };
      }>(url);
      return normalsFromDaily(body.daily);
    },
  };
}
```

`src/server/weather/fake.ts`:
```ts
import type { ClimateNormals } from "../climate";
import type { CityResult, WeatherProvider } from "./types";

const CITIES: { city: CityResult; normals: ClimateNormals }[] = [
  {
    city: { label: "Campinas, São Paulo, Brasil", latitude: -22.91, longitude: -47.06, countryCode: "BR" },
    normals: { monthlyMeanTemp: Array(12).fill(23), annualPrecip: 1400 },
  },
  {
    city: { label: "Curitiba, Paraná, Brasil", latitude: -25.43, longitude: -49.27, countryCode: "BR" },
    normals: { monthlyMeanTemp: [21, 21, 20, 17, 15, 13, 13, 14, 15, 17, 19, 20], annualPrecip: 1400 },
  },
  {
    city: { label: "Lisboa, Lisboa, Portugal", latitude: 38.72, longitude: -9.14, countryCode: "PT" },
    normals: { monthlyMeanTemp: [11, 12, 14, 15, 18, 21, 23, 23, 22, 18, 14, 12], annualPrecip: 700 },
  },
];

const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function createFakeWeatherProvider(options: { failNormals?: boolean } = {}): WeatherProvider {
  return {
    async searchCities(query) {
      return CITIES.filter((c) => plain(c.city.label).includes(plain(query))).map((c) => c.city);
    },
    async getClimateNormals(latitude, longitude) {
      if (options.failNormals) throw new Error("serviço de clima fora (falso)");
      const match = CITIES.find((c) => c.city.latitude === latitude && c.city.longitude === longitude);
      return match?.normals ?? CITIES[0].normals;
    },
  };
}
```

`src/server/weather/index.ts`:
```ts
import { createFakeWeatherProvider } from "./fake";
import { createOpenMeteoProvider } from "./open-meteo";
import type { WeatherProvider } from "./types";

let provider: WeatherProvider | undefined;

export function getWeatherProvider(): WeatherProvider {
  provider ??= process.env.WEATHER_FAKE === "1" ? createFakeWeatherProvider() : createOpenMeteoProvider();
  return provider;
}
```

`src/server/registration.ts`:
```ts
import type { SignupInput } from "@/lib/validation";
import { EmailTakenError, createUser, getUserById } from "./accounts";
import {
  classifyClimate,
  estimateZoneByLatitude,
  hemisphereFor,
  type ResolvedClimate,
} from "./climate";
import type { Db } from "./db";
import type { WeatherProvider } from "./weather/types";

export async function resolveClimate(
  provider: WeatherProvider,
  latitude: number,
  longitude: number,
): Promise<ResolvedClimate> {
  const hemisphere = hemisphereFor(latitude);
  try {
    const normals = await provider.getClimateNormals(latitude, longitude);
    return { zone: classifyClimate(normals), estimated: false, hemisphere };
  } catch {
    return { zone: estimateZoneByLatitude(latitude), estimated: true, hemisphere };
  }
}

export type RegisterResult = { ok: true; userId: number } | { ok: false; error: "emailTaken" };

export async function registerUser(db: Db, provider: WeatherProvider, input: SignupInput): Promise<RegisterResult> {
  const climate = await resolveClimate(provider, input.city.latitude, input.city.longitude);
  try {
    const userId = await createUser(db, { ...input, climate });
    return { ok: true, userId };
  } catch (error) {
    if (error instanceof EmailTakenError) return { ok: false, error: "emailTaken" };
    throw error;
  }
}

export async function refreshEstimatedClimate(db: Db, provider: WeatherProvider, userId: number): Promise<void> {
  const user = getUserById(db, userId);
  if (!user?.climateEstimated) return;
  const climate = await resolveClimate(provider, user.latitude, user.longitude);
  if (climate.estimated) return;
  db.prepare("UPDATE users SET climate_zone = ?, climate_estimated = 0 WHERE id = ?").run(climate.zone, userId);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/integration/open-meteo.test.ts tests/integration/registration.test.ts`
Expected: PASS.

Run: `npm run test:live`
Expected: PASS (2 tests, precisa de internet).

- [ ] **Step 7: Commit**

```bash
git add src/server/weather src/server/registration.ts tests/integration/open-meteo.test.ts tests/integration/registration.test.ts tests/live
git commit -m "feat: Open-Meteo para cidades e tipo de clima no cadastro"
```

---

### Task 9: Idiomas, tema e preferências

**Files:**
- Create: `src/i18n/request.ts`, `src/server/preferences.ts`, `src/server/current-user.ts`, `src/app/actions/preferences.ts`, `src/components/TopControls.tsx`, `src/components/LocaleToggle.tsx`, `src/components/ThemeToggle.tsx`
- Modify: `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/integration/preferences.test.ts`

**Interfaces:**
- Consumes: `Locale`, `Theme`, `resolveLocale`, `resolveTheme`, `LOCALES` (Task 5); cookies (Task 2); `getSessionUser` (Task 6); `getUserById` (Task 5).
- Produces: `setPreferences(db, userId, prefs: { locale?: Locale; theme?: Theme }): void`; `getCurrentUser(): Promise<User | null>`; `startSession(userId: number, user: User): Promise<void>` (grava cookies de sessão, idioma e tema); `endSession(): Promise<void>`; `setLocaleAction(locale: string)`, `setThemeAction(theme: string)`; componente `<TopControls />`.

- [ ] **Step 1: Teste**

`tests/integration/preferences.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getUserById } from "@/server/accounts";
import { setPreferences } from "@/server/preferences";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("setPreferences", () => {
  it("salva idioma e tema na conta", async () => {
    const db = testDb();
    const id = await makeUser(db);
    setPreferences(db, id, { locale: "en", theme: "dark" });
    expect(getUserById(db, id)).toMatchObject({ locale: "en", theme: "dark" });
  });

  it("muda só o que foi pedido", async () => {
    const db = testDb();
    const id = await makeUser(db);
    setPreferences(db, id, { theme: "dark" });
    expect(getUserById(db, id)).toMatchObject({ locale: "pt", theme: "dark" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/integration/preferences.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o servidor**

`src/server/preferences.ts`:
```ts
import type { Locale, Theme } from "@/i18n/locales";
import type { Db } from "./db";

export function setPreferences(db: Db, userId: number, prefs: { locale?: Locale; theme?: Theme }): void {
  if (prefs.locale) db.prepare("UPDATE users SET locale = ? WHERE id = ?").run(prefs.locale, userId);
  if (prefs.theme) db.prepare("UPDATE users SET theme = ? WHERE id = ?").run(prefs.theme, userId);
}
```

`src/server/current-user.ts`:
```ts
import { cookies } from "next/headers";
import { LOCALE_COOKIE, SESSION_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import type { User } from "./accounts";
import { getDb } from "./db";
import { SESSION_TTL_MS, createSession, deleteSession, getSessionUser } from "./sessions";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(getDb(), token) : null;
}

export async function startSession(user: User): Promise<void> {
  const store = await cookies();
  const token = createSession(getDb(), user.id);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  store.set(LOCALE_COOKIE, user.locale, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
  store.set(THEME_COOKIE, user.theme, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}

export async function setPreferenceCookie(name: typeof LOCALE_COOKIE | typeof THEME_COOKIE, value: string) {
  (await cookies()).set(name, value, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
}
```

`src/app/actions/preferences.ts`:
```ts
"use server";

import { resolveLocale, resolveTheme } from "@/i18n/locales";
import { LOCALE_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import { getCurrentUser, setPreferenceCookie } from "@/server/current-user";
import { getDb } from "@/server/db";
import { setPreferences } from "@/server/preferences";

export async function setLocaleAction(value: string): Promise<void> {
  const locale = resolveLocale(value);
  await setPreferenceCookie(LOCALE_COOKIE, locale);
  const user = await getCurrentUser();
  if (user) setPreferences(getDb(), user.id, { locale });
}

export async function setThemeAction(value: string): Promise<void> {
  const theme = resolveTheme(value);
  await setPreferenceCookie(THEME_COOKIE, theme);
  const user = await getCurrentUser();
  if (user) setPreferences(getDb(), user.id, { theme });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/integration/preferences.test.ts`
Expected: PASS.

- [ ] **Step 5: Ligar next-intl, tema e controles**

`src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/cookies";
import { resolveLocale } from "./locales";

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default withNextIntl(nextConfig);
```

`src/app/globals.css` (substituir o conteúdo; as cores vêm do protótipo escolhido na Etapa 0 — estes são os valores iniciais):
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg: #f6f2e8;
  --surface: #ffffff;
  --text: #2b2a26;
  --muted: #6b675d;
  --primary: #3f7d3a;
  --primary-text: #ffffff;
  --border: #e2dccd;
  --danger: #b42318;
}

.dark {
  --bg: #14170f;
  --surface: #1f241a;
  --text: #ece8dc;
  --muted: #a8a493;
  --primary: #7fbf6a;
  --primary-text: #10140c;
  --border: #343a2b;
  --danger: #f97066;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-primary: var(--primary);
  --color-primary-text: var(--primary-text);
  --color-border: var(--border);
  --color-danger: var(--danger);
}

body {
  background: var(--bg);
  color: var(--text);
}
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveTheme } from "@/i18n/locales";
import { THEME_COOKIE } from "@/lib/cookies";
import "./globals.css";

export const metadata: Metadata = { title: "NewFarmer" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`src/components/LocaleToggle.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/preferences";
import { LOCALES, type Locale } from "@/i18n/locales";

export function LocaleToggle({ current }: { current: Locale }) {
  const t = useTranslations("toggles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-full border border-border">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setLocaleAction(locale);
              router.refresh();
            })
          }
          className="px-3 py-1 text-sm font-semibold aria-pressed:bg-primary aria-pressed:text-primary-text"
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

`src/components/ThemeToggle.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { setThemeAction } from "@/app/actions/preferences";
import type { Theme } from "@/i18n/locales";

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("toggles");
  const [theme, setTheme] = useState(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    void setThemeAction(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
      title={theme === "dark" ? t("themeLight") : t("themeDark")}
      className="rounded-full border border-border px-3 py-1 text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
```

`src/components/TopControls.tsx`:
```tsx
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveLocale, resolveTheme } from "@/i18n/locales";
import { THEME_COOKIE } from "@/lib/cookies";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function TopControls() {
  const locale = resolveLocale(await getLocale());
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="flex items-center gap-2">
      <LocaleToggle current={locale} />
      <ThemeToggle initial={theme} />
    </div>
  );
}
```

- [ ] **Step 6: Conferir build e testes**

Run: `npm run build && npm test`
Expected: build sem erros; todos os testes PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: idiomas PT/EN, modo noturno e preferências salvas na conta"
```

---

### Task 10: Telas de conta, área protegida e Painel provisório

**Files:**
- Create: `src/app/actions/auth.ts`, `src/app/api/cities/route.ts`, `src/middleware.ts`, `src/components/FieldError.tsx`, `src/components/SubmitButton.tsx`, `src/components/CityPicker.tsx`, `src/components/AuthCard.tsx`, `public/landscape.svg`, `src/app/(public)/layout.tsx`, `src/app/(public)/login/page.tsx`, `src/app/(public)/login/LoginForm.tsx`, `src/app/(public)/cadastro/page.tsx`, `src/app/(public)/cadastro/SignupForm.tsx`, `src/app/(public)/recuperar/page.tsx`, `src/app/(public)/recuperar/ForgotForm.tsx`, `src/app/(public)/recuperar/[token]/page.tsx`, `src/app/(public)/recuperar/[token]/ResetForm.tsx`, `src/app/(public)/dev/inbox/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/painel/page.tsx`
- Modify: `src/app/page.tsx`
- Test: coberto pela Task 11 (E2E). Aqui: `npm run build` e checagem manual.

**Interfaces:**
- Consumes: tudo das Tasks 2–9.
- Produces: `type FormState = { fieldErrors?: Record<string, string>; formError?: string; done?: boolean; values?: Record<string, string> }` (`values` devolve o que foi digitado — nunca senhas — porque o React 19 limpa o formulário depois de cada envio); actions `signupAction`, `loginAction`, `logoutAction`, `forgotAction`, `resetAction` com assinatura `(prev: FormState, formData: FormData) => Promise<FormState>` (exceto `logoutAction(): Promise<void>`); rotas `/login`, `/cadastro`, `/recuperar`, `/recuperar/[token]`, `/dev/inbox`, `/painel`. `data-testid` usados no E2E: `city-input`, `city-option`, `user-climate`, `dev-email-link`.

- [ ] **Step 1: Actions de conta**

`src/app/actions/auth.ts`:
```ts
"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import { forgotSchema, loginSchema, resetSchema, signupSchema, toFieldErrors } from "@/lib/validation";
import { getUserById, verifyCredentials } from "@/server/accounts";
import { endSession, startSession } from "@/server/current-user";
import { getDb } from "@/server/db";
import { createDevInboxMailer } from "@/server/mailer";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";
import { setPreferences } from "@/server/preferences";
import { refreshEstimatedClimate, registerUser } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";

export type FormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  done?: boolean;
  values?: Record<string, string>;
};

function parseCity(raw: FormDataEntryValue | null): unknown {
  try {
    return typeof raw === "string" && raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function typed(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "name", "email");
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: parseCity(formData.get("city")),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = getDb();
  const result = await registerUser(db, getWeatherProvider(), parsed.data);
  if (!result.ok) return { fieldErrors: { email: "emailTaken" }, values };

  setPreferences(db, result.userId, { locale: resolveLocale(await getLocale()) });
  await startSession(getUserById(db, result.userId)!);
  redirect("/painel");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "email");
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = getDb();
  const result = await verifyCredentials(db, parsed.data.email, parsed.data.password);
  if (!result.ok) return { formError: result.reason === "locked" ? "locked" : "invalidCredentials", values };

  await refreshEstimatedClimate(db, getWeatherProvider(), result.userId).catch(() => undefined);
  await startSession(getUserById(db, result.userId)!);
  redirect("/painel");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: typed(formData, "email") };

  const db = getDb();
  await requestPasswordReset(db, createDevInboxMailer(db), {
    email: parsed.data.email,
    baseUrl: process.env.APP_URL ?? "http://localhost:3000",
    locale: resolveLocale(await getLocale()),
  });
  return { done: true };
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const result = await resetPassword(getDb(), parsed.data);
  return result === "ok" ? { done: true } : { formError: "linkExpired" };
}
```

- [ ] **Step 2: Rota de cidades e middleware**

`src/app/api/cities/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { resolveLocale } from "@/i18n/locales";
import { getWeatherProvider } from "@/server/weather";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));
  if (query.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await getWeatherProvider().searchCities(query.slice(0, 100), locale));
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
```

`src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookies";

export function middleware(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/painel/:path*", "/myfarm/:path*", "/animais/:path*", "/plantacoes/:path*", "/clima/:path*"],
};
```

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/painel");
}
```

- [ ] **Step 3: Componentes de formulário**

`src/components/FieldError.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";

export function FieldError({ code, id }: { code?: string; id: string }) {
  const t = useTranslations("errors");
  if (!code) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {t(code)}
    </p>
  );
}
```

`src/components/SubmitButton.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  const t = useTranslations("auth");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-text transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? t("sending") : children}
    </button>
  );
}
```

`src/components/CityPicker.tsx`:
```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { CityChoice } from "@/lib/validation";
import { FieldError } from "./FieldError";

export function CityPicker({ error }: { error?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CityChoice[]>([]);
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "empty" | "failed">("idle");

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setOptions([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}&locale=${locale}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const list = (await response.json()) as CityChoice[];
        setOptions(list);
        setStatus(list.length ? "idle" : "empty");
      } catch {
        if (!controller.signal.aborted) setStatus("failed");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected, locale]);

  const shownError = status === "empty" ? "cityNotFound" : status === "failed" ? "citySearchFailed" : error;

  return (
    <div className="relative">
      <label htmlFor="city" className="mb-1 block text-sm font-medium">
        {t("city")}
      </label>
      <input
        id="city"
        data-testid="city-input"
        value={selected ? selected.label : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
        }}
        placeholder={t("cityPlaceholder")}
        autoComplete="off"
        aria-invalid={Boolean(shownError)}
        aria-describedby="city-error"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2"
      />
      <input type="hidden" name="city" value={selected ? JSON.stringify(selected) : ""} />
      {status === "searching" && <p className="mt-1 text-sm text-muted">{t("citySearching")}</p>}
      {options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {options.map((city) => (
            <li key={`${city.latitude},${city.longitude}`}>
              <button
                type="button"
                data-testid="city-option"
                onClick={() => {
                  setSelected(city);
                  setOptions([]);
                }}
                className="w-full px-3 py-2 text-left hover:bg-bg"
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldError id="city-error" code={shownError} />
    </div>
  );
}
```

`src/components/AuthCard.tsx`:
```tsx
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface/95 p-8 shadow-xl backdrop-blur">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Layout público e fundo**

`public/landscape.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bfe3f2"/>
      <stop offset="1" stop-color="#fdf3d8"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="900" fill="url(#sky)"/>
  <circle cx="1150" cy="220" r="80" fill="#ffd36b"/>
  <path d="M0 560 Q 300 440 620 540 T 1440 500 V900 H0Z" fill="#9cc58a"/>
  <path d="M0 660 Q 400 560 820 650 T 1440 620 V900 H0Z" fill="#6fa85d"/>
  <path d="M0 760 Q 500 690 960 760 T 1440 740 V900 H0Z" fill="#4c8a3f"/>
  <g fill="#8a5a3b">
    <rect x="210" y="560" width="120" height="80"/>
    <polygon points="200,560 270,510 340,560"/>
  </g>
</svg>
```

`src/app/(public)/layout.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { TopControls } from "@/components/TopControls";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="relative min-h-screen bg-[url('/landscape.svg')] bg-cover bg-bottom dark:bg-[linear-gradient(rgba(10,12,8,.65),rgba(10,12,8,.65)),url('/landscape.svg')]">
      <header className="flex items-center justify-between px-8 py-5">
        <div>
          <p className="text-2xl font-extrabold text-[#2f5d2a] dark:text-[#cfe8c4]">🌾 {t("name")}</p>
          <p className="text-sm text-[#2f5d2a]/80 dark:text-[#cfe8c4]/80">{t("tagline")}</p>
        </div>
        <TopControls />
      </header>
      <main className="flex justify-center px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Login**

`src/app/(public)/login/page.tsx`:
```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return <LoginForm />;
}
```

`src/app/(public)/login/LoginForm.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <AuthCard title={t("loginTitle")}>
      <form action={action} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">{t("email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" aria-describedby="email-error"
            defaultValue={state.values?.email} key={state.values?.email}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2" />
          <FieldError id="email-error" code={state.fieldErrors?.email} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">{t("password")}</label>
          <input id="password" name="password" type="password" autoComplete="current-password"
            aria-describedby="password-error" className="w-full rounded-lg border border-border bg-surface px-3 py-2" />
          <FieldError id="password-error" code={state.fieldErrors?.password} />
        </div>
        {state.formError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{tErrors(state.formError)}</p>
        )}
        <SubmitButton pending={pending}>{t("login")}</SubmitButton>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/recuperar" className="text-primary hover:underline">{t("forgot")}</Link>
        <Link href="/cadastro" className="font-semibold text-primary hover:underline">{t("createAccount")}</Link>
      </div>
    </AuthCard>
  );
}
```

O `key` no campo de e-mail força o React a reaplicar o valor digitado depois que o formulário é limpo. Senhas nunca voltam.

- [ ] **Step 6: Cadastro**

`src/app/(public)/cadastro/page.tsx`:
```tsx
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return <SignupForm />;
}
```

`src/app/(public)/cadastro/SignupForm.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { CityPicker } from "@/components/CityPicker";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2";

export function SignupForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <AuthCard title={t("signupTitle")}>
      <form action={action} noValidate className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">{t("name")}</label>
          <input id="name" name="name" autoComplete="name" defaultValue={state.values?.name} key={`n-${state.values?.name}`}
            aria-describedby="name-error" className={inputClass} />
          <FieldError id="name-error" code={errors.name} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">{t("email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email}
            key={`e-${state.values?.email}`} aria-describedby="email-error" className={inputClass} />
          <FieldError id="email-error" code={errors.email} />
          {errors.email === "emailTaken" && (
            <Link href="/login" className="text-sm text-primary hover:underline">{t("login")}</Link>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">{t("password")}</label>
          <input id="password" name="password" type="password" autoComplete="new-password"
            aria-describedby="password-error" className={inputClass} />
          <FieldError id="password-error" code={errors.password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">{t("confirmPassword")}</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
            aria-describedby="confirmPassword-error" className={inputClass} />
          <FieldError id="confirmPassword-error" code={errors.confirmPassword} />
        </div>
        <CityPicker error={errors.city} />
        {state.formError && <p role="alert" className="text-sm text-danger">{tErrors(state.formError)}</p>}
        <SubmitButton pending={pending}>{t("createAccount")}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("haveAccount")}</Link>
      </p>
    </AuthCard>
  );
}
```

Observação: depois de um erro o React reseta o formulário e o `CityPicker` mantém o próprio estado (é controlado), então a cidade escolhida não se perde — mas o `<input type="hidden">` é controlado pelo estado, o que garante o envio correto.

- [ ] **Step 7: Recuperar senha**

`src/app/(public)/recuperar/page.tsx`:
```tsx
import { ForgotForm } from "./ForgotForm";

export default function ForgotPage() {
  return <ForgotForm />;
}
```

`src/app/(public)/recuperar/ForgotForm.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<FormState, FormData>(forgotAction, {});

  return (
    <AuthCard title={t("forgotTitle")}>
      {state.done ? (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2">{t("forgotSent")}</p>
      ) : (
        <form action={action} noValidate className="space-y-4">
          <p className="text-sm text-muted">{t("forgotHelp")}</p>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">{t("email")}</label>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email}
              key={state.values?.email} aria-describedby="email-error"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2" />
            <FieldError id="email-error" code={state.fieldErrors?.email} />
          </div>
          <SubmitButton pending={pending}>{t("sendLink")}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("backToLogin")}</Link>
      </p>
    </AuthCard>
  );
}
```

`src/app/(public)/recuperar/[token]/page.tsx`:
```tsx
import { ResetForm } from "./ResetForm";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
```

`src/app/(public)/recuperar/[token]/ResetForm.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { resetAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(resetAction, {});

  return (
    <AuthCard title={t("resetTitle")}>
      {state.done ? (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2">{t("resetDone")}</p>
      ) : (
        <form action={action} noValidate className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">{t("password")}</label>
            <input id="password" name="password" type="password" autoComplete="new-password"
              aria-describedby="password-error" className={inputClass} />
            <FieldError id="password-error" code={state.fieldErrors?.password} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">{t("confirmPassword")}</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
              aria-describedby="confirmPassword-error" className={inputClass} />
            <FieldError id="confirmPassword-error" code={state.fieldErrors?.confirmPassword} />
          </div>
          {state.formError && (
            <p role="alert" className="text-sm text-danger">
              {tErrors(state.formError)} — <Link href="/recuperar" className="underline">{t("sendLink")}</Link>
            </p>
          )}
          <SubmitButton pending={pending}>{t("savePassword")}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("backToLogin")}</Link>
      </p>
    </AuthCard>
  );
}
```

- [ ] **Step 8: Caixa de e-mail de teste**

`src/app/(public)/dev/inbox/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { listDevEmails } from "@/server/mailer";

export const dynamic = "force-dynamic";

export default async function DevInboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const t = await getTranslations("devInbox");
  const emails = listDevEmails(getDb());

  return (
    <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-border bg-surface p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("help")}</p>
      {emails.length === 0 && <p>{t("empty")}</p>}
      {emails.map((email) => (
        <article key={email.id} className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted">
            {t("to")}: {email.to} · {new Date(email.createdAt).toLocaleString()}
          </p>
          <h2 className="font-semibold">{email.subject}</h2>
          {/* Corpo gerado pelo próprio sistema, com o nome do usuário já escapado em password-reset.ts */}
          <div data-testid="dev-email-link" className="prose mt-2 [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: email.html }} />
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Área protegida e Painel provisório**

`src/app/(app)/layout.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { TopControls } from "@/components/TopControls";
import { getCurrentUser } from "@/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen">
      <nav className="w-60 shrink-0 border-r border-border bg-surface p-6">
        <p className="mb-8 text-xl font-extrabold text-primary">🌾 {t("app.name")}</p>
        <ul className="space-y-1">
          <li>
            <Link href="/painel" className="block rounded-lg px-3 py-2 font-medium hover:bg-bg">📊 {t("nav.dashboard")}</Link>
          </li>
        </ul>
      </nav>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4">
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted" data-testid="user-climate">
              {user.cityLabel} · {t(`climate.${user.climateZone}`)}
              {user.climateEstimated && ` (${t("climate.estimated")})`} · {t(`climate.${user.hemisphere}`)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TopControls />
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-border px-3 py-1 text-sm">{t("auth.logout")}</button>
            </form>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
```

`src/app/(app)/painel/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/current-user";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations("dashboard");
  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">{t("hello", { name: user.name })}</h1>
      <p className="text-muted">{t("comingSoon")}</p>
    </section>
  );
}
```

- [ ] **Step 10: Conferir build, testes e uso manual**

Run: `npm run build && npm test`
Expected: build sem erros; todos os testes PASS.

Run: `npm run dev` e abrir `http://localhost:3000`: cadastrar com uma cidade real, ver o Painel, trocar idioma e tema, sair, entrar, pedir recuperação de senha e abrir o link pela `/dev/inbox`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: telas de login, cadastro, recuperação de senha e painel provisório"
```

---

### Task 11: Testes de ponta a ponta (robô no navegador)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: rotas e `data-testid` da Task 10; provedor falso via `WEATHER_FAKE=1` (Task 8).

- [ ] **Step 1: Instalar o navegador do robô (pedir confirmação ao usuário antes)**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Configuração**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100", locale: "pt-BR" },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_PATH: "data/e2e.db", WEATHER_FAKE: "1", APP_URL: "http://localhost:3100" },
  },
});
```

- [ ] **Step 3: Testes**

`tests/e2e/auth.spec.ts`:
```ts
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "segredo123";

function uniqueEmail() {
  return `ana+${Date.now()}${Math.floor(Math.random() * 1000)}@exemplo.com`;
}

async function signup(page: Page, email: string, city = "Curitiba") {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill(city);
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

test("cadastro leva ao painel com o tipo de clima da cidade", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Olá, Ana!" })).toBeVisible();
  await expect(page.getByTestId("user-climate")).toContainText("Curitiba");
  await expect(page.getByTestId("user-climate")).toContainText("Subtropical");
  await expect(page.getByTestId("user-climate")).toContainText("Hemisfério sul");
});

test("cadastro mostra os erros dos campos", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill("ana@");
  await page.getByLabel("Senha", { exact: true }).fill("123");
  await page.getByLabel("Confirmar senha").fill("456");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Preencha este campo")).toBeVisible();
  await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeVisible();
  await expect(page.getByText("Escolha uma cidade da lista")).toBeVisible();
});

test("cidade inexistente mostra aviso", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByTestId("city-input").fill("Xyzlândia");
  await expect(page.getByText("Não encontramos essa cidade")).toBeVisible();
});

test("e-mail repetido avisa que já existe conta", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await context.clearCookies();
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill("Curitiba");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Este e-mail já tem uma conta. Quer entrar?")).toBeVisible();
});

test("sair, errar a senha e entrar de novo", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("painel sem login volta para a entrada", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
});

test("idioma e modo noturno mudam e continuam depois de recarregar", async ({ page }) => {
  await signup(page, uniqueEmail());

  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();

  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("preferências voltam ao entrar de novo", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("recuperar a senha pela caixa de e-mail de teste", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await context.clearCookies();

  await page.goto("/recuperar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta com esse e-mail")).toBeVisible();

  await page.goto("/dev/inbox");
  await page.locator("article", { hasText: email }).first().getByRole("link").click();
  await page.getByLabel("Senha", { exact: true }).fill("nova-senha-1");
  await page.getByLabel("Confirmar senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});
```

- [ ] **Step 4: Rodar**

Run: `npm run test:e2e`
Expected: PASS (9 tests). Se algum falhar, usar a skill `diagnosing-bugs` antes de mudar código.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e
git commit -m "test: robô de ponta a ponta para contas, idioma e tema"
```

---

## Fim da Etapa 1

- [ ] `npm test`, `npm run test:e2e` e `npm run test:live` passam.
- [ ] Mostrar ao usuário, em linguagem simples, o que já dá para usar e como abrir (`npm run dev` → `http://localhost:3000`).
- [ ] Escrever o plano da Etapa 2.
