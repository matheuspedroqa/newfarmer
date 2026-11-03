# NewFarmer Etapa 4 — Fazendas com equipe, papéis, segurança e páginas legais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Cada cadastro vira uma **fazenda** com **número de registro**, e a fazenda tem várias contas (username + senha) com **papéis e permissões** definidos pelo admin.
- O login passa a pedir **número de registro + username + senha**.
- Entram:
  - segurança: limite de tentativas, sessão de 1 h sem uso, dados nunca expostos, debug desligado;
  - **registro de atividades**;
  - **monitoramento** para o dono do site;
  - página inicial com CTA, 404, títulos de página, privacidade, termos e aviso de cookies.

**Architecture:**
- Uma tabela `farms` passa a ser dona de tudo o que é da fazenda: local, clima, animais, plantações e diário.
- `users` vira "conta de uma pessoa dentro de uma fazenda", com `role_id`.
- As permissões são textos fixos definidos no código (`src/lib/permissions.ts`). O admin monta papéis marcando permissões.
- Toda leitura e escrita passa por um contexto `{ user, farmId, permissions }` vindo da sessão. Nenhuma consulta aceita `farm_id` vindo do navegador.
- O banco ganha **migrações numeradas** (tabela `schema_migrations`), porque agora há dados reais no Supabase a converter.

**Tech Stack:** a mesma de hoje.
- Next.js 15 App Router, TypeScript, Tailwind v4, next-intl;
- Postgres (Supabase online, PGlite local), `pg`;
- zod, bcryptjs, Vitest, Playwright, Resend.

Sem dependências novas.

## Global Constraints

- Decisões do usuário (2026-11-03):
  - **Monitoramento** é só para o **dono do site**. Admins de fazenda usam Settings → Activity logs.
  - **Papéis livres:** o admin cria papéis e marca permissões. Toda fazenda nasce com os papéis **Admin** e **Funcionário**.
  - **Sessão:** expira após **1 hora sem uso**. Quem está usando continua logado. Teto absoluto de 30 dias.
  - **CTA:** página inicial pública `/` com "Criar conta da fazenda" no topo e "Entrar" ao lado.
- **Login:** número de registro + username + senha. Formato do número: `NF-` + 6 dígitos (ex.: `NF-482913`), único e gerado pelo sistema.
- **Contas por fazenda:** sem limite fixo. "5 ou mais" é o uso esperado, não um teto.
- **Username:**
  - 3 a 30 caracteres: `a-z`, `0-9`, `.`, `_`, `-`;
  - único **dentro da fazenda**, sem diferença entre maiúsculas e minúsculas;
  - o mesmo username pode existir em fazendas diferentes.
- **E-mail:**
  - obrigatório só para a conta do admin que criou a fazenda; opcional para funcionários;
  - quem não tem e-mail recupera a senha **pelo admin**, em Settings → Users → "Redefinir senha".
- **Menu do topo, à esquerda do Sair:**
  - todos veem MyFarm (só com permissão `farm.edit`) e Perfil;
  - o admin vê também **Settings**, com Users, Roles & Permissions e Activity logs;
  - o dono do site vê **Monitoramento**, logo abaixo do Perfil.
- **Isolamento:**
  - toda consulta de dados da fazenda filtra por `farm_id` da sessão;
  - o Perfil mostra e edita **só a própria conta**;
  - ninguém lê nem altera conta de outra fazenda.
- **SQL:**
  - só consultas parametrizadas (`$1`, `$2`…);
  - proibido montar SQL com `${}` vindo de dado do usuário;
  - um teste varre `src/` e falha se encontrar isso.
- **Dados para o navegador:**
  - componentes de cliente recebem só campos mínimos;
  - nunca hash de senha, hash de token, `farm_id` de outra fazenda ou objeto de linha inteiro do banco;
  - `src/server/*` usa `import "server-only"`.
- **Limites de tentativas** (`rate_limits` no Postgres, porque a Vercel roda em várias máquinas):
  - login: 10 a cada 15 min por IP, além do bloqueio já existente de 5 erros por conta;
  - cadastro: 5 por hora por IP;
  - "esqueci senha" e "esqueci o número": 5 por hora por IP;
  - busca de cidades: 60 por minuto por IP;
  - ações de escrita (diário, MyFarm, Settings): 120 por minuto por conta.
- **Registro de atividades** (`activity_logs`):
  - o que se registra: login (certo e errado), saída, cadastro, troca e redefinição de senha, confirmação de e-mail, MyFarm, diário (criar e apagar), contas (criar, editar, desativar, redefinir senha), papéis (criar, editar, apagar);
  - cada registro guarda quem, o quê, alvo, IP e quando;
  - guardado por 180 dias.
- **Debug desligado em produção:**
  - sem cabeçalho `X-Powered-By`, sem mapas de código no navegador;
  - `/dev/inbox` e `WEATHER_FAKE` não valem com `NODE_ENV=production`;
  - erros mostram mensagem genérica e o detalhe vai só para o log do servidor.
- **Cabeçalhos de segurança** em todas as respostas: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (câmera, microfone e geolocalização desligados) e `Strict-Transport-Security` em produção.
- **Cookies:** o site usa só cookies essenciais (`nf_session`, `nf_locale`, `nf_theme`, `nf_cookie_notice`). O aviso informa e tem "Entendi". Não há rastreamento, então não há "aceitar/recusar".
- **Privacidade e termos:**
  - em PT e EN, seguindo o RGPD, porque o titular está em Portugal e o banco no Supabase eu-west-1 (Irlanda);
  - fornecedores: Supabase, Vercel, Resend, Open-Meteo;
  - o cadastro exige marcar "Li e aceito os Termos e a Política de Privacidade".
- **Títulos:** toda página tem um título no formato `<Página> · NewFarmer`, traduzido.
- Textos para o usuário sempre em PT e EN (`messages/*.json`).

## Antes de começar: o que o usuário precisa informar

Respondido em 2026-11-03:

1. Responsável pelo tratamento / controlador: **Matheus Lemes**
2. Contato de privacidade (encarregado / DPO): **matheusps70@hotmail.com**
3. Sede do responsável: **Jundiaí, São Paulo, Brasil**.
   - **Termos:** lei brasileira, foro da comarca de Jundiaí/SP.
   - **Privacidade:** cobre a **LGPD** (controlador no Brasil; reclamação à ANPD) **e** o **RGPD** (usuários na UE; banco no Supabase eu-west-1; reclamação à autoridade do país, ex.: CNPD em Portugal).

## Estrutura de arquivos

```
src/server/migrations.ts            migrações numeradas (substitui o SCHEMA único de db.ts)
src/server/request-context.ts       IP e user-agent da requisição (x-forwarded-for na Vercel)
src/server/rate-limit.ts            hit(db, key, limit, windowMs) → { ok, retryAfterMs }
src/server/activity-log.ts          logActivity(), listActivity(), purgeOldActivity()
src/server/farms.ts                 createFarm(), getFarm…(), número de registro
src/server/roles.ts                 papéis e permissões (CRUD por fazenda)
src/server/team.ts                  contas da fazenda (Settings → Users)
src/server/authz.ts                 requireUser() com farm/permissões; requirePermission()
src/server/monitoring.ts            números do site inteiro (dono do site)
src/lib/permissions.ts              lista fixa de permissões + rótulos
src/lib/registration.ts             formato e validação do número NF-000000
src/app/(app)/settings/...          users, roles, activity
src/app/(app)/monitoramento/page.tsx
src/app/(marketing)/page.tsx        página inicial pública com CTA
src/app/(marketing)/privacidade/page.tsx
src/app/(marketing)/termos/page.tsx
src/app/not-found.tsx               404
src/components/CookieNotice.tsx
next.config.ts                      cabeçalhos de segurança, poweredByHeader: false
tests/unit/sql-safety.test.ts       varredura contra SQL montado com ${}
```

---

## Fase 1: Base de segurança

Não depende das fazendas e pode ir ao ar sozinha.

### Task 1: Migrações numeradas

O `SCHEMA` único com `CREATE IF NOT EXISTS` não dá conta de mudar tabelas que já têm dados. Esta task cria a migração 1, que reproduz o banco de hoje. As próximas tasks só acrescentam migrações.

**Files:**
- Create: `src/server/migrations.ts`
- Modify: `src/server/db.ts` (troca `SCHEMA` por `migrate(db)`)
- Test: `tests/integration/migrations.test.ts`, `tests/integration/db.test.ts`

**Interfaces:**
- Produces: `MIGRATIONS: { id: number; name: string; sql: string }[]` e `migrate(db: Db): Promise<number[]>`, que devolve os ids aplicados agora.

- [ ] **Step 1: Teste que falha**

```ts
// tests/integration/migrations.test.ts
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS, migrate } from "@/server/migrations";
import { pgliteDb } from "@/server/db";

describe("migrações", () => {
  it("aplica todas uma vez e, na segunda, nenhuma", async () => {
    const db = pgliteDb(new PGlite());
    expect(await migrate(db)).toEqual(MIGRATIONS.map((m) => m.id));
    expect(await migrate(db)).toEqual([]);
  });

  it("banco antigo (só com o SCHEMA de antes) é reconhecido como migração 1 sem perder dados", async () => {
    const lite = new PGlite();
    await lite.exec(MIGRATIONS[0].sql);
    await lite.exec(`INSERT INTO users (name,email,password_hash,city_label,latitude,longitude,country_code,climate_zone,hemisphere,created_at)
      VALUES ('Ana','a@x.com','h','C',0,0,'PT','temperate','north',0)`);
    const db = pgliteDb(lite);
    await migrate(db);
    expect(await db.query("SELECT name FROM users")).toEqual([{ name: "Ana" }]);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/integration/migrations.test.ts`. Esperado: FALHA (módulo não existe).
- [ ] **Step 3: Implementação**

```ts
// src/server/migrations.ts
import "server-only";
import type { Db } from "./db";

export const MIGRATIONS = [
  { id: 1, name: "base", sql: `/* conteúdo atual de SCHEMA em db.ts, sem mudar nada */` },
] as const satisfies readonly { id: number; name: string; sql: string }[];

export async function migrate(db: Db): Promise<number[]> {
  await db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at BIGINT NOT NULL)`);
  await db.run("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
  const done = new Set((await db.query<{ id: number }>("SELECT id FROM schema_migrations")).map((r) => r.id));
  const applied: number[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.run("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [m.id, Date.now()]);
    });
    applied.push(m.id);
  }
  return applied;
}
```

- `Db` ganha `exec(sql)` (vários comandos sem parâmetros): no `pg`, `client.query(sql)`; no PGlite, `exec`. `pgliteDb` passa a ser exportado.
- A migração 1 usa só `IF NOT EXISTS`, por isso funciona também no Supabase, que já tem as tabelas.
- `openShared()` e `openMemoryDb()` chamam `migrate(db)` no lugar de `exec(SCHEMA)`.
- [ ] **Step 4:** `npx vitest run`. Esperado: tudo passa. Ajuste `db.test.ts`: a lista de tabelas inclui `schema_migrations`.
- [ ] **Step 5:** commit `feat: migrações numeradas do banco`.

### Task 2: Debug desligado e cabeçalhos de segurança

**Files:**
- Modify: `next.config.ts`
- Modify: `src/server/weather/index.ts` (`WEATHER_FAKE` só fora de produção)
- Modify: `src/server/*.ts` (`import "server-only"` no topo de todo módulo que toca banco, senha ou token)
- Test: `tests/unit/production-flags.test.ts`, `tests/e2e/security-headers.spec.ts`

- [ ] **Step 1: Testes que falham**

```ts
// tests/unit/production-flags.test.ts
import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllEnvs());

it("em produção WEATHER_FAKE é ignorado", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("WEATHER_FAKE", "1");
  const { getWeatherProvider } = await import("@/server/weather");
  expect(getWeatherProvider().constructor.name).not.toMatch(/fake/i);
});
```

```ts
// tests/e2e/security-headers.spec.ts
import { expect, test } from "@playwright/test";
test("respostas trazem cabeçalhos de segurança e não dizem a tecnologia", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("nada de dado interno do banco chega ao navegador", async ({ page }) => {
  await signup(page, uniqueEmail());
  for (const path of ["/painel", "/perfil", "/myfarm", "/animais/cows?aba=diario"]) {
    await page.goto(path);
    const html = await page.content(); // inclui o JSON que o Next manda para os componentes de cliente
    for (const leak of ["password_hash", "token_hash", "$2a$", "$2b$", "farm_id", "email_verified_at"]) {
      expect(html, `${path} vazou ${leak}`).not.toContain(leak);
    }
  }
});
```

- [ ] **Step 2:** rode os dois. Esperado: FALHAM.
- [ ] **Step 3: Implementação**

```ts
// next.config.ts
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  // Next injeta scripts inline de hidratação; 'unsafe-eval' só em dev (recarregamento rápido).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

- `getWeatherProvider()`: `if (process.env.WEATHER_FAKE === "1" && process.env.NODE_ENV !== "production")`.
- `server-only` já vem com o Next. Se um componente de cliente importar módulo do servidor, a montagem do site falha.
- [ ] **Step 4:** `npx vitest run`, `npx playwright test tests/e2e/security-headers.spec.ts`, `npm run build`. Esperado: tudo verde. Confira se o modo noturno e as fontes continuam carregando com a CSP.
- [ ] **Step 5:** commit `feat: cabeçalhos de segurança e debug desligado em produção`.

### Task 3: Proteção contra SQL injection (varredura automática)

Hoje todas as consultas já são parametrizadas. Esta task impede que alguém quebre isso no futuro.

**Files:**
- Test: `tests/unit/sql-safety.test.ts`
- Test: `tests/integration/sql-injection.test.ts`

- [ ] **Step 1: Testes**

```ts
// tests/unit/sql-safety.test.ts
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
}

it("nenhuma consulta monta SQL com ${} (use $1, $2…)", () => {
  const offenders = files("src").flatMap((f) => {
    const text = fs.readFileSync(f, "utf8");
    // db.query(`...${x}...`) ou db.run(`...${x}...`)
    return [...text.matchAll(/\.(query|run|exec)(<[^>]*>)?\(\s*`[^`]*\$\{/g)].map(() => f);
  });
  expect(offenders).toEqual([]);
});
```

```ts
// tests/integration/sql-injection.test.ts
import { expect, it } from "vitest";
import { verifyCredentials } from "@/server/accounts";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

it.each(["' OR '1'='1", "admin'--", "x'; DROP TABLE users; --"])("login com %j não entra nem quebra o banco", async (evil) => {
  const db = await testDb();
  await makeUser(db);
  expect((await verifyCredentials(db, evil, evil)).ok).toBe(false);
  expect(await db.query("SELECT COUNT(*)::int AS n FROM users")).toEqual([{ n: 1 }]);
});
```

Depois da Task 7, `verifyCredentials` passa a receber número, username e senha. Atualize este teste junto.
- [ ] **Step 2:** `npx vitest run tests/unit/sql-safety.test.ts tests/integration/sql-injection.test.ts`. Esperado: PASSA, porque o código já é seguro. Para provar que a varredura funciona, troque temporariamente um `$1` por `${email}` em `accounts.ts`, veja falhar e desfaça.
- [ ] **Step 3:** commit `test: varredura contra SQL montado com texto do usuário`.

### Task 4: Limite de tentativas (rate limit)

**Files:**
- Create: `src/server/rate-limit.ts`, `src/server/request-context.ts`
- Modify: `src/server/migrations.ts` (migração 2: `rate_limits`)
- Modify: `src/app/actions/auth.ts`, `src/app/api/cities/route.ts`, `src/app/actions/diary.ts`, `src/app/actions/farm.ts`
- Modify: `messages/*.json` (`errors.rateLimited`: "Muitas tentativas. Tente de novo em alguns minutos.")
- Test: `tests/integration/rate-limit.test.ts`, `tests/e2e/rate-limit.spec.ts`

**Interfaces:**
- Produces:
  - `hit(db, key: string, limit: number, windowMs: number, now?) → Promise<{ ok: boolean; retryAfterMs: number }>`;
  - `clientIp(): Promise<string>`;
  - `RATE_LIMITS` com chaves e limites dos Global Constraints.

- [ ] **Step 1: Teste que falha**

```ts
// tests/integration/rate-limit.test.ts
import { expect, it } from "vitest";
import { hit } from "@/server/rate-limit";
import { testDb } from "../helpers/db";

it("deixa passar até o limite, bloqueia depois e libera quando a janela vira", async () => {
  const db = await testDb();
  for (let i = 0; i < 3; i++) expect((await hit(db, "login:1.2.3.4", 3, 60_000, 1000)).ok).toBe(true);
  expect(await hit(db, "login:1.2.3.4", 3, 60_000, 2000)).toEqual({ ok: false, retryAfterMs: 59_000 });
  expect((await hit(db, "login:5.6.7.8", 3, 60_000, 2000)).ok).toBe(true); // outro IP não é afetado
  expect((await hit(db, "login:1.2.3.4", 3, 60_000, 61_000)).ok).toBe(true);
});
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**

```sql
-- migração 2
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window_start BIGINT NOT NULL, count INTEGER NOT NULL);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
```

```ts
// src/server/rate-limit.ts
import "server-only";
import type { Db } from "./db";

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  recovery: { limit: 5, windowMs: 60 * 60_000 },
  citySearch: { limit: 60, windowMs: 60_000 },
  write: { limit: 120, windowMs: 60_000 },
} as const;

/** Janela fixa num só comando atômico: funciona com várias máquinas da Vercel ao mesmo tempo. */
export async function hit(db: Db, key: string, limit: number, windowMs: number, now = Date.now()) {
  const [row] = await db.query<{ window_start: number; count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key) DO UPDATE SET
       window_start = CASE WHEN rate_limits.window_start + $3 <= $2 THEN $2 ELSE rate_limits.window_start END,
       count = CASE WHEN rate_limits.window_start + $3 <= $2 THEN 1 ELSE rate_limits.count + 1 END
     RETURNING window_start, count`,
    [key, now, windowMs],
  );
  return row.count <= limit
    ? { ok: true, retryAfterMs: 0 }
    : { ok: false, retryAfterMs: row.window_start + windowMs - now };
}
```

```ts
// src/server/request-context.ts
import "server-only";
import { headers } from "next/headers";

/** Na Vercel o primeiro endereço de x-forwarded-for é o do visitante (a Vercel sobrescreve o cabeçalho). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}
```

- Em cada ação: `if (!(await hit(db, \`login:${ip}\`, ...RATE_LIMITS.login)).ok) return { formError: "rateLimited" }`. As chaves são texto de chave, não SQL, então a varredura da Task 3 não acusa.
- `/api/cities` responde `429` com `Retry-After`.
- Limpeza: `DELETE FROM rate_limits WHERE window_start < $1` com `now - 1 dia`, rodado junto da limpeza dos logs (Task 6).
- [ ] **Step 4: E2E.** Faça 11 logins errados seguidos com e-mails diferentes e espere "Muitas tentativas".
  - O robô roda tudo do mesmo IP (`local`), então o teste precisa da variável `RATE_LIMIT_SCALE=0.1`, que divide os limites por 10.
  - Ela vale só fora de produção e entra em `playwright.config.ts → webServer.env`.
- [ ] **Step 5:** `npx vitest run` e `npx playwright test`. Commit `feat: limite de tentativas por IP e por conta`.

### Task 5: Sessão expira após 1 hora sem uso

**Files:**
- Modify: `src/server/migrations.ts` (migração 3: `sessions.last_seen_at`)
- Modify: `src/server/sessions.ts`, `src/server/current-user.ts`
- Test: `tests/integration/sessions.test.ts`

**Interfaces:**
- Produces: `SESSION_IDLE_MS = 60 * 60_000`. `getSessionUser(db, token, now)` atualiza `last_seen_at`, no máximo uma vez a cada 5 min, para não gravar no banco a cada clique.

- [ ] **Step 1: Testes que falham**

```ts
it("1 hora parado: a sessão acaba", async () => {
  const db = await testDb();
  const token = await createSession(db, await makeUser(db), 0);
  expect(await getSessionUser(db, token, SESSION_IDLE_MS + 1)).toBeNull();
});

it("quem continua usando não é desconectado", async () => {
  const db = await testDb();
  const id = await makeUser(db);
  const token = await createSession(db, id, 0);
  for (let t = 50 * 60_000; t <= 5 * 60 * 60_000; t += 50 * 60_000) {
    expect((await getSessionUser(db, token, t))?.id).toBe(id);
  }
});
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**

```sql
-- migração 3
ALTER TABLE sessions ADD COLUMN last_seen_at BIGINT;
UPDATE sessions SET last_seen_at = expires_at - 30 * 24 * 3600 * 1000 WHERE last_seen_at IS NULL;
ALTER TABLE sessions ALTER COLUMN last_seen_at SET NOT NULL;
```

- `createSession` grava `last_seen_at = now`.
- `getSessionUser`:
  - com `expires_at <= now` ou `now - last_seen_at > SESSION_IDLE_MS`, apaga a sessão e devolve `null`;
  - com `now - last_seen_at > 5 min`, faz `UPDATE sessions SET last_seen_at = $1 WHERE token_hash = $2`.
- O cookie `nf_session` deixa de ter `maxAge` e vira cookie de navegador. Quem decide é o banco.
- [ ] **Step 4:** `npx vitest run tests/integration/sessions.test.ts`. Depois a suíte inteira e o robô. Commit `feat: sessão expira após 1 hora sem uso`.

### Task 6: Registro de atividades (base)

**Files:**
- Create: `src/server/activity-log.ts`
- Modify: `src/server/migrations.ts` (migração 4: `activity_logs`)
- Test: `tests/integration/activity-log.test.ts`

**Interfaces:**
- Produces:
  - `type ActivityAction = "auth.login" | "auth.loginFailed" | "auth.logout" | "auth.signup" | "auth.passwordChanged" | "auth.passwordReset" | "auth.emailConfirmed" | "farm.updated" | "diary.created" | "diary.deleted" | "team.userCreated" | "team.userUpdated" | "team.userDisabled" | "team.passwordReset" | "roles.created" | "roles.updated" | "roles.deleted"`;
  - `logActivity(db, entry: { farmId: number | null; userId: number | null; action: ActivityAction; target?: string; details?: Record<string, string | number | boolean>; ip: string }, now?)`;
  - `listActivity(db, farmId, { userId?, action?, before?, limit = 50 })`;
  - `purgeOld(db, now)`, que apaga logs com mais de 180 dias e rate_limits com mais de 1 dia.

- [ ] **Step 1: Teste que falha**

```ts
it("grava e lista só da própria fazenda, do mais novo para o mais antigo", async () => {
  const db = await testDb();
  await logActivity(db, { farmId: 1, userId: null, action: "auth.loginFailed", target: "ana", ip: "1.1.1.1" }, 1);
  await logActivity(db, { farmId: 1, userId: null, action: "auth.login", target: "ana", ip: "1.1.1.1" }, 2);
  await logActivity(db, { farmId: 2, userId: null, action: "auth.login", target: "bia", ip: "2.2.2.2" }, 3);
  expect((await listActivity(db, 1, {})).map((e) => e.action)).toEqual(["auth.login", "auth.loginFailed"]);
});

it("detalhes nunca guardam senha nem token", async () => {
  const db = await testDb();
  await expect(
    logActivity(db, { farmId: 1, userId: null, action: "auth.login", details: { password: "x" }, ip: "" }),
  ).rejects.toThrow(/proibido/);
});
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**

```sql
-- migração 4 (farm_id sem FK por enquanto; a Task 7 cria farms e liga)
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY, farm_id INTEGER, user_id INTEGER, action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '', details JSONB NOT NULL DEFAULT '{}', ip TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_activity_farm ON activity_logs (farm_id, created_at DESC);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
```

- `logActivity` recusa chaves de `details` que casem com `/pass|token|hash|secret/i`. Também corta `target` em 200 caracteres.
- `purgeOld` roda de forma oportunista: 1 em cada 200 chamadas de `logActivity` (`Math.random() < 0.005`). Assim não precisa de agendador.
  - shortcut: a limpeza depende do movimento do site; quando houver Vercel Cron, mova para lá.
- [ ] **Step 4:** testes verdes. Commit `feat: base do registro de atividades`.

---

## Fase 2: Fazendas, contas da equipe, papéis e Settings

### Task 7: Fazendas e migração dos dados de hoje

**Files:**
- Create: `src/server/farms.ts`, `src/lib/registration.ts`
- Modify: `src/server/migrations.ts` (migração 5)
- Modify: `src/server/accounts.ts`
  - `User` ganha `farmId`, `username`, `registrationNumber`, `roleId`, `isAdmin`, `isPlatformAdmin` e `permissions: Set<Permission>`;
  - `cityLabel`, `latitude` e os outros campos de local passam a vir da fazenda, via JOIN.
- Modify: `src/server/farm.ts`, `src/server/diary.ts` e `src/server/registration.ts` (`changeCity`), que trocam `user_id` por `farm_id` nos dados da fazenda.
- Test: `tests/integration/farms.test.ts`, `tests/unit/registration.test.ts`. Ajuste todos os testes que usam `makeUser`.

**Interfaces:**
- Produces:
  - `formatRegistration(n: number) → "NF-482913"`;
  - `parseRegistration(text) → number | null`, que aceita "nf482913", "NF-482913" e " 482913 ";
  - `createFarm(db, { name, city, climate }) → { farmId, registrationNumber }`;
  - o número é aleatório de 6 dígitos; em colisão, tenta de novo até 5 vezes.

- [ ] **Step 1: Testes que falham**

```ts
// tests/unit/registration.test.ts
it.each([["NF-482913", 482913], ["nf482913", 482913], [" 482913 ", 482913], ["NF-12", null], ["abc", null]])(
  "%j → %j", (text, n) => expect(parseRegistration(text)).toBe(n));
```

```ts
// tests/integration/farms.test.ts
it("migração 5 transforma cada conta antiga numa fazenda com ela como Admin", async () => {
  const lite = new PGlite();
  const db = pgliteDb(lite);
  await migrateUpTo(db, 4);
  await db.run(`INSERT INTO users (name,email,password_hash,city_label,latitude,longitude,country_code,climate_zone,hemisphere,created_at)
    VALUES ('Matheus','matheus@x.com','h','Fundão',40.1,-7.5,'PT','temperate','north',0)`);
  await db.run(`INSERT INTO farm_animals (user_id, animal_id, count) VALUES (1, 'cows', 3)`);
  await migrate(db);
  const [u] = await db.query<{ username: string; role: string; reg: number; city: string }>(
    `SELECT u.username, r.name AS role, f.registration_number AS reg, f.city_label AS city
     FROM users u JOIN farms f ON f.id = u.farm_id JOIN roles r ON r.id = u.role_id`);
  expect(u).toMatchObject({ username: "matheus", role: "Admin", city: "Fundão" });
  expect(u.reg).toBeGreaterThanOrEqual(100000);
  expect(await db.query("SELECT animal_id, count FROM farm_animals")).toEqual([{ animal_id: "cows", count: 3 }]);
});
```

`migrateUpTo(db, n)` é um auxiliar de teste exportado por `migrations.ts` só para isso.
- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Migração 5**

```sql
CREATE TABLE farms (
  id SERIAL PRIMARY KEY,
  registration_number INTEGER NOT NULL UNIQUE CHECK (registration_number BETWEEN 100000 AND 999999),
  name TEXT NOT NULL, city_label TEXT NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
  country_code TEXT NOT NULL, climate_zone TEXT NOT NULL, climate_estimated INTEGER NOT NULL DEFAULT 0,
  hemisphere TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE roles (
  id SERIAL PRIMARY KEY, farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL, is_admin BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL,
  UNIQUE (farm_id, name)
);
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission)
);

-- uma fazenda por conta antiga, com o local da conta
INSERT INTO farms (registration_number, name, city_label, latitude, longitude, country_code, climate_zone, climate_estimated, hemisphere, created_at)
SELECT 100000 + ((id * 7919 + 104729) % 900000), name, city_label, latitude, longitude, country_code, climate_zone, climate_estimated, hemisphere, created_at
FROM users ORDER BY id;

ALTER TABLE users ADD COLUMN farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN disabled_at BIGINT;
UPDATE users u SET farm_id = f.id FROM farms f WHERE f.created_at = u.created_at AND f.name = u.name;

INSERT INTO roles (farm_id, name, is_admin, created_at) SELECT id, 'Admin', TRUE, created_at FROM farms;
INSERT INTO roles (farm_id, name, is_admin, created_at) SELECT id, 'Funcionário', FALSE, created_at FROM farms;
INSERT INTO role_permissions (role_id, permission)
  SELECT r.id, p FROM roles r, unnest(ARRAY['animals.view','crops.view','weather.view','diary.write']) p WHERE NOT r.is_admin;

UPDATE users u SET role_id = r.id FROM roles r WHERE r.farm_id = u.farm_id AND r.is_admin;
UPDATE users SET username = lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g'));
UPDATE users SET username = 'admin' WHERE length(username) < 3;

ALTER TABLE users ALTER COLUMN farm_id SET NOT NULL, ALTER COLUMN username SET NOT NULL, ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_key;
CREATE UNIQUE INDEX users_farm_username ON users (farm_id, lower(username));
CREATE UNIQUE INDEX users_email_unique ON users (lower(email)) WHERE email IS NOT NULL;
ALTER TABLE users DROP COLUMN city_label, DROP COLUMN latitude, DROP COLUMN longitude, DROP COLUMN country_code,
  DROP COLUMN climate_zone, DROP COLUMN climate_estimated, DROP COLUMN hemisphere;

-- dados da fazenda passam de user_id para farm_id
ALTER TABLE farm_animals ADD COLUMN farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE;
UPDATE farm_animals a SET farm_id = u.farm_id FROM users u WHERE u.id = a.user_id;
ALTER TABLE farm_animals DROP CONSTRAINT farm_animals_pkey, DROP COLUMN user_id, ADD PRIMARY KEY (farm_id, animal_id);
ALTER TABLE farm_crops ADD COLUMN farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE;
UPDATE farm_crops c SET farm_id = u.farm_id FROM users u WHERE u.id = c.user_id;
ALTER TABLE farm_crops DROP CONSTRAINT farm_crops_pkey, DROP COLUMN user_id, ADD PRIMARY KEY (farm_id, crop_id);
ALTER TABLE diary_entries ADD COLUMN farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE;
UPDATE diary_entries d SET farm_id = u.farm_id FROM users u WHERE u.id = d.user_id;
ALTER TABLE diary_entries ALTER COLUMN farm_id SET NOT NULL;   -- user_id fica: é quem escreveu
ALTER TABLE diary_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE diary_entries DROP CONSTRAINT diary_entries_user_id_fkey,
  ADD CONSTRAINT diary_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_diary_farm ON diary_entries (farm_id, animal_id, entry_date);
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_farm_fk FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
```

- O número da migração vem de uma conta fixa (`id * 7919 …`) porque migração não pode depender de sorteio. Fazendas novas usam sorteio em `createFarm`.
- **Antes de rodar no Supabase,** faça backup em Supabase → Database → Backups e teste a migração numa cópia: `pg_dump` local para o PGlite.
- [ ] **Step 4:** adapte `getUserById` (JOIN `farms`, `roles`, `role_permissions`), `getFarm(db, farmId)`, `saveFarm(db, farmId, …)`, `listDiary(db, farmId, …)`, `addDiaryEntry(db, { farmId, userId }, …)` e `changeCity(db, provider, farmId, city)`.
  - Em `tests/helpers/users.ts`, `makeUser` passa a criar fazenda + Admin. Ganha também `makeMember(db, farmId, { username, permissions })`.
  - Rode a suíte inteira até ficar verde.
- [ ] **Step 5:** commit `feat: fazendas com número de registro; dados passam a ser da fazenda`.

### Task 8: Permissões e verificação em todas as páginas e ações

**Files:**
- Create: `src/lib/permissions.ts`, `src/server/authz.ts`
- Modify: todas as páginas de `src/app/(app)/` e todas as ações de `src/app/actions/`
- Modify: `src/app/(app)/layout.tsx` e `src/components/NavRail.tsx` (escondem o que a pessoa não pode ver)
- Test: `tests/unit/permissions.test.ts`, `tests/integration/authz.test.ts`, `tests/e2e/permissions.spec.ts`

**Interfaces:**
- Produces:

```ts
// src/lib/permissions.ts
import { ANIMAL_IDS } from "./catalog";
export const PERMISSIONS = [
  ...ANIMAL_IDS.flatMap((a) => [`animals.${a}.view`, `animals.${a}.diary`] as const),
  "crops.view", "weather.view", "farm.edit",
  "settings.users", "settings.roles", "settings.logs",
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const isPermission = (p: string): p is Permission => (PERMISSIONS as readonly string[]).includes(p);
```

```ts
// src/server/authz.ts
export async function requireUser(): Promise<User>; // como hoje, mais: conta desativada → sai e vai para /login
export async function requirePermission(p: Permission): Promise<User>; // sem permissão → notFound() (404, não revela que existe)
export function can(user: User, p: Permission): boolean; // admin (role.is_admin) pode tudo
```

- A permissão `animals.<id>.view` deixa ver a ficha e o diário daquele animal; `animals.<id>.diary` deixa escrever e apagar no diário dele.
- No Painel, cada pessoa vê só os blocos que pode: animais permitidos, plantações com `crops.view` e clima com `weather.view`.
- A migração 5 deu ao "Funcionário" permissões antigas (`animals.view`, `diary.write`). A **migração 6** troca essas pelas novas, por animal.

- [ ] **Step 1: Testes que falham**

```ts
// tests/integration/authz.test.ts
it("quem cuida das vacas vê vacas, não vê porcos e não entra em Settings", async () => {
  const db = await testDb();
  const { farmId } = await makeUserWithFarm(db);
  const vaqueiro = await makeMember(db, farmId, { username: "joao", permissions: ["animals.cows.view", "animals.cows.diary"] });
  const user = (await getUserById(db, vaqueiro))!;
  expect(can(user, "animals.cows.view")).toBe(true);
  expect(can(user, "animals.pigs.view")).toBe(false);
  expect(can(user, "settings.users")).toBe(false);
});

it("diário de outra fazenda não aparece nem pode ser apagado", async () => {
  const db = await testDb();
  const a = await makeUserWithFarm(db, { email: "a@x.com" });
  const b = await makeUserWithFarm(db, { email: "b@x.com" });
  const id = await addDiaryEntry(db, { farmId: a.farmId, userId: a.userId }, entry);
  expect(await listDiary(db, b.farmId, {})).toEqual([]);
  expect(await deleteDiaryEntry(db, b.farmId, id)).toBe(false);
});
```

```ts
// tests/e2e/permissions.spec.ts
test("funcionário das vacas: trilho sem Porcos e Settings; abrir /animais/pigs dá 404", async ({ page }) => {
  // admin cria papel "Vaqueiro" (animals.cows.*) e conta "joao" (Tasks 10 e 11), sai, entra como joao
  // espera: link Vacas visível; /animais/pigs → 404; /settings/users → 404; menu sem "Settings"
});
```

Este E2E é escrito por completo na Task 11, quando as telas existirem. Aqui fica só o integration.
- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3:** implemente `permissions.ts` e `authz.ts`. Troque `requireUser()` por `requirePermission(...)` em cada página e ação:

| Página ou ação | Permissão |
|---|---|
| `/animais/[id]` | `animals.<id>.view` |
| `addDiaryAction`, `deleteDiaryAction` | `animals.<animalId>.diary` (o `animalId` do apagar vem do banco, não do formulário) |
| `/plantacoes*` | `crops.view` |
| `/clima` | `weather.view` |
| `/myfarm`, `saveFarmAction`, `changeCityAction` | `farm.edit` |
| `/settings/*` | `settings.*` |

- Painel e Perfil: só `requireUser()`.
- [ ] **Step 4:** suíte inteira e robô verdes. Commit `feat: permissões por papel em todas as páginas e ações`.

### Task 9: Cadastro da fazenda e login por número + username

**Files:**
- Modify: `src/lib/validation.ts`:
  - `signupSchema` ganha `farmName`, `username` e `acceptTerms: z.literal("on")`;
  - `loginSchema` passa a ser `{ registration, username, password }`.
- Modify: `src/server/accounts.ts` (`verifyCredentials(db, { registration, username, password })`; o bloqueio de 5 erros passa a ser por `registration:username`)
- Modify: `src/server/registration.ts` (`registerFarm()`: fazenda + papéis padrão + Admin, numa transação)
- Modify: `src/app/(public)/cadastro/SignupForm.tsx`, `src/app/(public)/login/LoginForm.tsx`
- Create: `src/app/(public)/cadastro/pronto/page.tsx`, que mostra o número de registro em destaque com botão "Copiar" e o aviso "Guarde este número: ele é pedido no login"
- Modify: `src/server/email-templates.ts`. O e-mail de confirmação inclui o número de registro e o username.
- Modify: `messages/*.json`
- Test: `tests/integration/registration.test.ts`, `tests/integration/accounts.test.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/helpers.ts`

- [ ] **Step 1: Testes que falham**

```ts
it("cadastro cria fazenda, papéis Admin e Funcionário e a conta admin", async () => {
  const db = await testDb();
  const r = await registerFarm(db, provider, { name: "Ana", farmName: "Quinta da Ana", username: "ana", email: "ana@x.com", password: "segredo123", city });
  expect(r.ok && r.registrationNumber).toMatch(/^NF-\d{6}$/);
  const user = (await getUserById(db, (r as { userId: number }).userId))!;
  expect(user).toMatchObject({ username: "ana", isAdmin: true });
});

it("login: número + username + senha; username vale só dentro da sua fazenda", async () => {
  const db = await testDb();
  const a = await registerFarm(db, provider, { ...base, email: "a@x.com", username: "joao" });
  const b = await registerFarm(db, provider, { ...base, email: "b@x.com", username: "joao" }); // mesmo username, outra fazenda: pode
  const regA = (a as { registrationNumber: string }).registrationNumber;
  expect((await verifyCredentials(db, { registration: regA, username: "JOAO", password: "segredo123" })).ok).toBe(true);
  expect((await verifyCredentials(db, { registration: "NF-000000", username: "joao", password: "segredo123" })).ok).toBe(false);
});

it("conta desativada não entra", async () => { /* disabled_at preenchido → { ok: false, reason: "invalid" } */ });
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3:** implemente.
  - A tela de login tem três campos ("Número de registro", "Username", "Senha") e o link "Esqueci o número de registro".
  - O número fica guardado num cookie `nf_last_registration` e já vem preenchido na próxima vez. Não é segredo, mas a página de privacidade explica.
  - O cadastro tem "Nome da fazenda", "Seu nome", "Username", "E-mail", "Senha", "Cidade" e a caixa de aceite dos termos. Depois de criar, vai para `/cadastro/pronto` e de lá para a etapa 2 (`/boas-vindas`).
  - Em `tests/e2e/helpers.ts`, `signup()` passa a devolver `{ registration, username }` lido da página "pronto", e `login()` usa os três campos.
- [ ] **Step 4:** suíte inteira e robô verdes. Commit `feat: cadastro da fazenda e login por número de registro`.

### Task 10: Recuperação de acesso

**Files:**
- Modify: `src/server/password-reset.ts`. O pedido passa a ser por número + username e só envia se a conta tiver e-mail confirmado. A resposta na tela é sempre a mesma, para não revelar se a conta existe.
- Create: `src/server/registration-reminder.ts` (`sendRegistrationReminder(db, mailer, email)`: manda por e-mail os números de registro e usernames ligados àquele e-mail)
- Create: `src/app/(public)/recuperar/numero/page.tsx`
- Modify: `src/server/email-templates.ts` (modelo `registrationReminderEmail`)
- Test: `tests/integration/password-reset.test.ts`, `tests/integration/registration-reminder.test.ts`, `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Testes que falham**
  - Recuperar senha por número + username com e-mail confirmado envia o link.
  - Sem e-mail ou com e-mail não confirmado, não envia, e a tela diz "Se a conta tiver e-mail confirmado, enviamos um link. Sem e-mail? Peça ao admin da fazenda para redefinir sua senha."
  - "Esqueci o número" com um e-mail de 2 fazendas envia um único e-mail com os 2 números.
- [ ] **Step 2–4:** implemente com os limites `RATE_LIMITS.recovery` e registre `auth.passwordReset`. Rode e veja verde.
- [ ] **Step 5:** commit `feat: recuperar senha por número e username, e lembrete do número por e-mail`.

### Task 11: Settings → Users (contas da equipe)

**Files:**
- Create: `src/server/team.ts`
- Create: `src/app/(app)/settings/layout.tsx` (abas Users | Roles & Permissions | Activity logs, cada uma só aparece com a permissão dela)
- Create: `src/app/(app)/settings/users/page.tsx`, `UserForm.tsx`
- Create: `src/app/actions/team.ts`
- Modify: `src/components/UserMenu.tsx` (item "Settings" se `can(user, "settings.*")`)
- Modify: `src/middleware.ts` (matcher inclui `/settings/:path*` e `/monitoramento/:path*`)
- Test: `tests/integration/team.test.ts`, `tests/e2e/settings.spec.ts`, `tests/e2e/permissions.spec.ts`

**Interfaces:**
- Produces:
  - `listTeam(db, farmId) → { id, name, username, email: string | null, roleId, roleName, disabled: boolean, lastLoginAt: number | null }[]`;
  - `createMember(db, farmId, { name, username, email?, password, roleId })`;
  - `updateMember(db, farmId, userId, { name?, roleId?, disabled? })`;
  - `resetMemberPassword(db, farmId, userId, newPassword)`, que também encerra as sessões da pessoa.
- Regras:
  - a fazenda nunca fica sem nenhum admin ativo: tirar o papel Admin ou desativar o último admin é recusado (`lastAdmin`);
  - ninguém se desativa sozinho;
  - todas as funções recebem `farmId` da sessão e nenhuma aceita conta de outra fazenda.

- [ ] **Step 1: Testes que falham**

```ts
it("admin cria funcionário; o funcionário entra com o número da fazenda", async () => { /* createMember + verifyCredentials */ });
it("não deixa a fazenda sem admin", async () => {
  /* updateMember no único admin com roleId de Funcionário → rejects "lastAdmin" */
});
it("não mexe em conta de outra fazenda", async () => {
  /* updateMember(db, farmB, userDaFarmA, …) → false; nada muda */
});
it("redefinir senha do funcionário derruba as sessões dele", async () => { /* … */ });
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Tela**
  - Tabela com nome, username, papel, situação (ativa/desativada) e último acesso.
  - Botão "+ Nova conta" abre um formulário com nome, username, e-mail opcional, senha provisória e papel.
  - Em cada linha: "Editar", "Redefinir senha" e "Desativar/Reativar".
  - Toda ação passa por `requirePermission("settings.users")` e `hit(write)`, e registra `team.*`.
- [ ] **Step 4: E2E** (`settings.spec.ts`)
  - O admin cria "joao" com papel Funcionário e sai.
  - Entra como joao com o mesmo número e vê o Painel.
  - O menu não mostra Settings, e `/settings/users` dá 404.
- [ ] **Step 5:** commit `feat: Settings → Users para contas da equipe`.

### Task 12: Settings → Roles & Permissions

**Files:**
- Create: `src/server/roles.ts`
- Create: `src/app/(app)/settings/roles/page.tsx`, `RoleForm.tsx`
- Create: `src/app/actions/roles.ts`
- Test: `tests/integration/roles.test.ts`, `tests/e2e/settings.spec.ts`

**Interfaces:**
- Produces:
  - `listRoles(db, farmId) → { id, name, isAdmin, permissions: Permission[], memberCount }[]`;
  - `saveRole(db, farmId, { id?, name, permissions })`;
  - `deleteRole(db, farmId, roleId)`, recusado se o papel tiver contas (`inUse`) ou for o Admin (`adminRole`).
- Permissões fora de `PERMISSIONS` são descartadas, conferidas com `isPermission`.

- [ ] **Step 1: Testes que falham**
  - Criar "Vaqueiro" com `animals.cows.view` e `animals.cows.diary`.
  - Permissão inventada ("root.all") é ignorada.
  - O papel Admin não pode ser editado nem apagado.
  - Papel com contas não pode ser apagado.
  - Papel de outra fazenda: nada muda.
- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Tela.** Lista de papéis com o número de pessoas em cada um. Ao editar, aparece uma grade de caixas de marcar:
  - linhas por animal (🐄 Vacas: [Ver] [Escrever no diário]);
  - depois Plantações [Ver], Clima [Ver], MyFarm [Editar];
  - e Settings [Users] [Roles] [Logs].
  - Botões "Marcar tudo" e "Limpar" por grupo.
- [ ] **Step 4: E2E.**
  - O admin cria "Vaqueiro" (só vacas) e passa joao para esse papel.
  - joao vê Vacas e não vê Porcos; `/animais/pigs` dá 404.
  - Esta é a versão completa do `permissions.spec.ts` da Task 8.
- [ ] **Step 5:** commit `feat: Settings → Roles & Permissions`.

### Task 13: Settings → Activity logs e registro em todas as ações

**Files:**
- Create: `src/app/(app)/settings/activity/page.tsx`
- Modify: todas as ações listadas em "Registro de atividades" nos Global Constraints (chamam `logActivity`)
- Test: `tests/integration/activity-log.test.ts`, `tests/e2e/settings.spec.ts`

- [ ] **Step 1: Testes que falham.** Login certo, login errado, diário criado e conta criada geram, cada um, uma linha com a ação, quem fez e o alvo esperados. Cubra as funções do servidor; as ações ficam cobertas pelo E2E.
- [ ] **Step 2: Tela**
  - Tabela com quando, quem (nome e username), o que (texto traduzido de cada `ActivityAction`), alvo e IP.
  - Filtros por pessoa e por tipo de ação.
  - Paginação "Carregar mais" (`before` = data do último item).
  - Mostra só a própria fazenda (`requirePermission("settings.logs")`).
- [ ] **Step 3: E2E.** O admin cria uma anotação no diário, abre Activity logs e vê "Anotação criada no diário · Vacas". Filtrar pela pessoa mostra só as ações dela.
- [ ] **Step 4:** commit `feat: Settings → Activity logs e registro das ações`.

### Task 14: Perfil só da própria conta

**Files:**
- Modify: `src/app/(app)/perfil/page.tsx`, que mostra nome, username, e-mail, fazenda, número de registro e papel (só leitura)
- Modify: `src/app/actions/profile.ts`, que edita só nome, e-mail, senha e idioma de `requireUser().id`
- Test: `tests/e2e/profile.spec.ts`

- [ ] **Step 1: E2E que falha.** Funcionário logado manda um formulário de perfil adulterado com `userId` de outra pessoa. O sistema ignora o campo, muda só a própria conta e a outra conta continua igual.
- [ ] **Step 2:** a ação não lê `userId` do formulário. Só esta linha de defesa e o teste.
- [ ] **Step 3:** commit `feat: perfil mostra fazenda, número e papel; edita só a própria conta`.

---

## Fase 3: Páginas públicas e legais

### Task 15: Página inicial com CTA, 404 e títulos de página

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`, que substitui `src/app/page.tsx` (apague o redirect)
- Create: `src/app/not-found.tsx`
- Modify: `src/app/layout.tsx` (`metadata.title = { template: "%s · NewFarmer", default: "NewFarmer" }`)
- Modify: cada `page.tsx`, que ganha `generateMetadata` com título traduzido:

| Página | Título |
|---|---|
| Painel | Painel |
| Animais | `<animal>` |
| Plantações | `<cultura>` |
| Clima | Clima |
| MyFarm | MyFarm |
| Perfil | Perfil |
| Settings → Users | Settings · Users |
| Entrar | Entrar |
| Criar conta | Criar conta |
| Recuperar | Recuperar |
| Privacidade | Privacidade |
| Termos | Termos |
| Monitoramento | Monitoramento |
| 404 | Página não encontrada |

- Test: `tests/e2e/pages.spec.ts`

- [ ] **Step 1: E2E que falha**

```ts
test("página inicial: CTA no topo leva ao cadastro; Entrar ao login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("NewFarmer");
  await page.getByRole("banner").getByRole("link", { name: "Criar conta da fazenda" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page).toHaveTitle("Criar conta · NewFarmer");
});

test("endereço que não existe mostra a 404 da casa", async ({ page }) => {
  const res = await page.goto("/nao-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
});

test.each([["/login", "Entrar"], ["/recuperar", "Recuperar"], ["/privacidade", "Privacidade"], ["/termos", "Termos"]])(
  "%s tem título próprio", async ({ page }, [path, title]) => {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
  });
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Página inicial**
  - Topo fixo com logo, "Entrar" (link discreto) e **"Criar conta da fazenda"** (botão primário).
  - Seção principal: "Seu guia para a vida no campo" e o mesmo botão.
  - 3 cartões: Animais, Plantações, Clima e equipe.
  - Rodapé com Privacidade e Termos.
  - Quem já está logado é levado ao `/painel`.
  - 404: ilustração simples (🌾), título, texto e "Voltar ao início" (`/` ou `/painel` se logado), com idioma e tema da pessoa.
- [ ] **Step 4:** robô verde. Commit `feat: página inicial com CTA, 404 e títulos de página`.

### Task 16: Aviso de cookies

**Files:**
- Create: `src/components/CookieNotice.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/cookies.ts` (`COOKIE_NOTICE_COOKIE = "nf_cookie_notice"`)
- Test: `tests/e2e/pages.spec.ts`

- [ ] **Step 1: E2E que falha.** Na primeira visita aparece "Usamos apenas cookies essenciais para manter você conectado e lembrar idioma e tema." com o link "Política de Privacidade" e o botão "Entendi". Depois de clicar em "Entendi" e recarregar, o aviso não volta.
- [ ] **Step 2:**
  - Faixa fixa no rodapé, com `role="region"` e `aria-label`.
  - "Entendi" grava o cookie por 1 ano.
  - O layout raiz lê o cookie no servidor e não renderiza o aviso se ele existir, para não piscar.
  - Os robôs atuais ganham `nf_cookie_notice=1` no `storageState` do `playwright.config.ts`, para o aviso não cobrir botões.
- [ ] **Step 3:** commit `feat: aviso de cookies essenciais`.

### Task 17: Política de Privacidade e Termos de Uso

**Depende de:** respostas do bloco "Antes de começar".

**Files:**
- Create: `src/app/(marketing)/privacidade/page.tsx`, `src/app/(marketing)/termos/page.tsx`
- Create: `content/legal/privacy.{pt,en}.md` e `content/legal/terms.{pt,en}.md`, mostrados como texto simples com títulos (um conversor mínimo de `#`, `##`, parágrafos e listas)
- Modify: `src/app/(public)/cadastro/SignupForm.tsx` (caixa de aceite com links)
- Test: `tests/e2e/pages.spec.ts`

**Conteúdo mínimo da Política (RGPD):**
1. responsável e contato;
2. dados recolhidos:
   - conta: nome, username, e-mail, senha guardada só embaralhada;
   - fazenda: nome, cidade e coordenadas, animais, plantações, diário;
   - técnicos: IP e data das ações, cookies essenciais;
3. finalidades e base legal (execução do contrato, interesse legítimo em segurança);
4. fornecedores e onde ficam os dados:
   - Supabase, Irlanda (UE);
   - Vercel, servidores na UE ou nos EUA com cláusulas contratuais-padrão;
   - Resend (envio de e-mail);
   - Open-Meteo (recebe só coordenadas arredondadas, sem dado pessoal);
5. prazos:
   - conta enquanto ativa;
   - registros de atividade por 180 dias;
   - limites de tentativas por 1 dia;
6. direitos (acesso, retificação, apagamento, portabilidade, oposição, reclamação à CNPD) e como pedir;
7. cookies (lista dos 4 e para que servem);
8. data da última atualização.

**Termos:**
1. o que o serviço é e o que não é: orientação geral, não substitui veterinário nem agrônomo; leis de registro de animais variam e devem ser confirmadas com o órgão oficial;
2. conta da fazenda: o admin responde pelas contas que cria;
3. uso proibido;
4. disponibilidade sem garantia;
5. encerramento da conta;
6. lei e foro;
7. contato.

- [ ] **Step 1: E2E que falha.**
  - As duas páginas abrem, nos dois idiomas, com o título certo.
  - O cadastro sem marcar o aceite mostra o erro "Para criar a conta, aceite os Termos e a Política de Privacidade".
- [ ] **Step 2:** escreva os textos e as páginas. Peça ao usuário para revisar os textos antes do commit.
- [ ] **Step 3:** commit `feat: política de privacidade, termos de uso e aceite no cadastro`.

---

## Fase 4: Monitoramento (dono do site)

### Task 18: Página de Monitoramento

**Files:**
- Create: `src/server/monitoring.ts`, `src/app/(app)/monitoramento/page.tsx`
- Create: `src/instrumentation.ts` (`onRequestError` grava em `error_logs`: rota, mensagem curta, hora; nunca o corpo do pedido)
- Modify: `src/server/migrations.ts` (migração 7: `error_logs` com RLS)
- Modify: `src/components/UserMenu.tsx` (item "Monitoramento" logo abaixo de "Perfil" se `user.isPlatformAdmin`)
- Modify: `docs/deploy.md`. Explica como se tornar dono do site, no SQL Editor do Supabase:
  `UPDATE users SET is_platform_admin = TRUE WHERE email = 'seu@email';`
  Não há tela para isso, de propósito.
- Test: `tests/integration/monitoring.test.ts`, `tests/e2e/monitoring.spec.ts`

**Interfaces:**
- Produces: `getPlatformStats(db, now) → { farms, users, activeSessions, logins24h: { ok, failed }, lockedAccounts, rateLimited24h, errors24h, recentErrors: { at, route, message }[], dbLatencyMs, weatherCacheEntries }`.

- [ ] **Step 1: Testes que falham**
  - Com 2 fazendas, 3 contas, 1 login certo e 2 errados nas últimas 24 h, `getPlatformStats` devolve esses números.
  - O E2E confirma que admin de fazenda comum não vê o item no menu e recebe 404 em `/monitoramento`.
- [ ] **Step 2:** `rateLimited24h` precisa de registro: `hit()` passa a gravar `logActivity(… action: "security.rateLimited")` quando bloqueia, com `farmId: null`. Acrescente essa ação ao tipo `ActivityAction`.
- [ ] **Step 3: Tela**
  - Cartões com fazendas, contas, sessões ativas, logins nas 24 h (certos/errados), contas bloqueadas, bloqueios por excesso, erros nas 24 h e tempo de resposta do banco.
  - Tabela com os últimos 50 erros.
  - Botão "Atualizar".
  - Só leitura, com `requirePlatformAdmin()` (404 para os outros).
  - Não mostra e-mails, nomes nem dados de fazendas: só números.
- [ ] **Step 4:** commit `feat: página de monitoramento para o dono do site`.

---

## Verificação final (depois da Task 18)

- [ ] `npx vitest run`, `npx playwright test` e `npm run build`: tudo verde.
- [ ] Migração no Supabase:
  - backup;
  - rodar o site uma vez com o `.env.local`, para aplicar as migrações;
  - conferir que a conta real (matheusps70@hotmail.com) virou Admin de uma fazenda com número `NF-…`, mantendo cidade, animais e diário;
  - mandar o número e o username ao usuário.
- [ ] `curl -I` no site da Vercel: cabeçalhos de segurança presentes e sem `X-Powered-By`.
- [ ] `/dev/inbox` online dá 404.
- [ ] RevisionCheck (5 revisores) e mp-code-review contra este plano.
