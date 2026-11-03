# NewFarmer Etapa 4 — Contas com username, segurança, registro de atividades e páginas legais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Contas individuais (público: pequenos produtores, sem equipe). O cadastro pede **e-mail + username**; o login pede só **username + senha**.
- Entram:
  - segurança: limite de tentativas, sessão de 1 h sem uso, dados nunca expostos, debug desligado;
  - **registro de atividades**;
  - **Settings** só para o dono do site, com Activity logs e Monitoramento;
  - página inicial com CTA, 404, títulos de página, privacidade (LGPD, RGPD e EUA), termos e aviso de cookies.

**Architecture:**
- Cada conta continua dona dos próprios dados (animais, plantações, diário), como hoje.
- `users` ganha `username` (único no site inteiro) e `is_platform_admin`.
- Toda leitura e escrita usa o `user.id` da sessão. Nenhuma consulta aceita id de conta vindo do navegador.
- O banco ganha **migrações numeradas** (tabela `schema_migrations`), porque agora há dados reais no Supabase a converter.

**Tech Stack:** a mesma de hoje.
- Next.js 15 App Router, TypeScript, Tailwind v4, next-intl;
- Postgres (Supabase online, PGlite local), `pg`;
- zod, bcryptjs, Vitest, Playwright, Resend.

Sem dependências novas.

## Global Constraints

- Decisões do usuário (2026-11-03, revistas no mesmo dia):
  - **Sem fazendas com equipe, sem papéis e permissões.** O público é o pequeno produtor, cada um com a sua conta.
  - **Cadastro:** nome, e-mail, username, senha, cidade. **Login:** username + senha.
  - **Settings** e **Monitoramento** são só para o **dono do site** (`users.is_platform_admin`, ligado à mão no SQL Editor do Supabase).
  - **Sessão:** expira após **1 hora sem uso**. Quem está usando continua logado. Teto absoluto de 30 dias.
  - **CTA:** página inicial pública `/` com "Criar conta grátis" no topo e "Entrar" ao lado.
- **Username:**
  - 3 a 30 caracteres: `a-z`, `0-9`, `.`, `_`, `-`;
  - guardado em minúsculas e **único no site inteiro**;
  - não pode ser só números nem um nome reservado (`admin`, `root`, `newfarmer`, `suporte`, `support`, `api`, `login`).
- **E-mail:** obrigatório e único, como hoje. Continua sendo o canal de confirmação de conta e de recuperação de senha.
- **Recuperação:** "Esqueci a senha" aceita username **ou** e-mail e envia o link para o e-mail da conta. "Esqueci o username" envia o username por e-mail. A tela responde sempre do mesmo jeito, para não revelar quem tem conta.
- **Menu do topo, à esquerda do Sair:** MyFarm e Perfil para todos; **Settings** (Activity logs, Monitoramento) só para o dono do site.
- **Isolamento:**
  - o Perfil mostra e edita **só a própria conta**;
  - ninguém lê nem altera dados de outra conta;
  - páginas do dono do site respondem 404 para os outros, sem revelar que existem.
- **SQL:**
  - só consultas parametrizadas (`$1`, `$2`…);
  - proibido montar SQL com `${}` vindo de dado do usuário;
  - um teste varre `src/` e falha se encontrar isso.
- **Dados para o navegador:**
  - componentes de cliente recebem só campos mínimos;
  - nunca hash de senha, hash de token ou objeto de linha inteiro do banco;
  - `src/server/*` usa `import "server-only"`.
- **Limites de tentativas** (`rate_limits` no Postgres, porque a Vercel roda em várias máquinas):
  - login: 10 a cada 15 min por IP, além do bloqueio já existente de 5 erros por conta;
  - cadastro: 5 por hora por IP;
  - "esqueci a senha" e "esqueci o username": 5 por hora por IP;
  - busca de cidades: 60 por minuto por IP;
  - ações de escrita (diário, MyFarm, Perfil): 120 por minuto por conta.
- **Registro de atividades** (`activity_logs`):
  - o que se registra: login (certo e errado), saída, cadastro, troca e redefinição de senha, confirmação de e-mail, MyFarm, diário (criar e apagar), Perfil (dados e idioma), bloqueio por excesso de tentativas;
  - cada registro guarda quem, o quê, alvo, IP e quando;
  - guardado por 180 dias;
  - lido pelo dono do site em Settings → Activity logs.
- **Debug desligado em produção:**
  - sem cabeçalho `X-Powered-By`, sem mapas de código no navegador;
  - `/dev/inbox` e `WEATHER_FAKE` não valem com `NODE_ENV=production`;
  - erros mostram mensagem genérica e o detalhe vai só para o log do servidor.
- **Cabeçalhos de segurança** em todas as respostas: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (câmera, microfone e geolocalização desligados) e `Strict-Transport-Security` em produção.
- **Cookies:** o site usa só cookies essenciais (`nf_session`, `nf_locale`, `nf_theme`, `nf_cookie_notice`). O aviso informa e tem "Entendi". Não há rastreamento, então não há "aceitar/recusar".
- **Privacidade e termos:**
  - em PT e EN, cobrindo **LGPD** (Brasil), **RGPD** (UE) e **EUA** (CCPA/CPRA da Califórnia e as leis estaduais parecidas, e a COPPA);
  - fornecedores: Supabase, Vercel, Resend, Open-Meteo;
  - o cadastro exige marcar "Li e aceito os Termos e a Política de Privacidade" e confirmar ter 13 anos ou mais.
- **Títulos:** toda página tem um título no formato `<Página> · NewFarmer`, traduzido.
- Textos para o usuário sempre em PT e EN (`messages/*.json`).

## Antes de começar: o que o usuário precisa informar

Respondido em 2026-11-03:

1. Responsável pelo tratamento / controlador: **Matheus Lemes**
2. Contato de privacidade (encarregado / DPO): **matheusps70@hotmail.com**
3. Sede do responsável: **Jundiaí, São Paulo, Brasil**.
   - **Termos:** lei brasileira, foro da comarca de Jundiaí/SP. Usuário dos EUA ou da UE mantém os direitos que a lei do seu lugar não deixa afastar.
   - **Privacidade:** cobre
     - a **LGPD** (controlador no Brasil; reclamação à ANPD);
     - o **RGPD** (usuários na UE; banco no Supabase eu-west-1; reclamação à autoridade do país, ex.: CNPD em Portugal);
     - os **EUA**: CCPA/CPRA e leis estaduais parecidas (direito de saber, apagar, corrigir, não ser discriminado e de optar por não ter dados vendidos ou compartilhados; o NewFarmer **não vende nem compartilha** dados para publicidade) e COPPA (o serviço não é para menores de 13 anos).

## Estrutura de arquivos

```
src/server/migrations.ts            migrações numeradas (substitui o SCHEMA único de db.ts)
src/server/request-context.ts       IP e user-agent da requisição (x-forwarded-for na Vercel)
src/server/rate-limit.ts            hit(db, key, limit, windowMs) → { ok, retryAfterMs }
src/server/activity-log.ts          logActivity(), listActivity(), purgeOld()
src/server/username.ts              regras do username e geração para contas antigas
src/server/authz.ts                 requirePlatformAdmin()
src/server/monitoring.ts            números do site inteiro (dono do site)
src/app/(app)/settings/...          activity (logs) e monitoramento — só dono do site
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

Não depende das mudanças de conta e pode ir ao ar sozinha.

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
  - `type ActivityAction = "auth.login" | "auth.loginFailed" | "auth.logout" | "auth.signup" | "auth.passwordChanged" | "auth.passwordReset" | "auth.emailConfirmed" | "farm.updated" | "diary.created" | "diary.deleted" | "profile.updated" | "security.rateLimited"`;
  - `logActivity(db, entry: { userId: number | null; action: ActivityAction; target?: string; details?: Record<string, string | number | boolean>; ip: string }, now?)`;
  - `listActivity(db, { userId?, action?, before?, limit = 50 })`: o site inteiro, para o dono do site;
  - `purgeOld(db, now)`, que apaga logs com mais de 180 dias e rate_limits com mais de 1 dia.

- [ ] **Step 1: Teste que falha**

```ts
it("grava e lista do mais novo para o mais antigo, filtrando por conta e por ação", async () => {
  const db = await testDb();
  const ana = await makeUser(db);
  await logActivity(db, { userId: null, action: "auth.loginFailed", target: "ana", ip: "1.1.1.1" }, 1);
  await logActivity(db, { userId: ana, action: "auth.login", target: "ana", ip: "1.1.1.1" }, 2);
  await logActivity(db, { userId: null, action: "auth.loginFailed", target: "bia", ip: "2.2.2.2" }, 3);
  expect((await listActivity(db, {})).map((e) => e.target)).toEqual(["bia", "ana", "ana"]);
  expect((await listActivity(db, { userId: ana })).map((e) => e.action)).toEqual(["auth.login"]);
  expect(await listActivity(db, { action: "auth.loginFailed" })).toHaveLength(2);
});

it("detalhes nunca guardam senha nem token", async () => {
  const db = await testDb();
  await expect(
    logActivity(db, { userId: null, action: "auth.login", details: { password: "x" }, ip: "" }),
  ).rejects.toThrow(/proibido/);
});
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**

```sql
-- migração 4 (user_id sem FK: o log sobrevive se a conta for apagada, e login errado não tem conta)
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '', details JSONB NOT NULL DEFAULT '{}', ip TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_activity_created ON activity_logs (created_at DESC);
CREATE INDEX idx_activity_user ON activity_logs (user_id, created_at DESC);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
```

- `logActivity` recusa chaves de `details` que casem com `/pass|token|hash|secret/i`. Também corta `target` em 200 caracteres.
- `purgeOld` roda de forma oportunista: 1 em cada 200 chamadas de `logActivity` (`Math.random() < 0.005`). Assim não precisa de agendador.
  - shortcut: a limpeza depende do movimento do site; quando houver Vercel Cron, mova para lá.
- [ ] **Step 4:** testes verdes. Commit `feat: base do registro de atividades`.

---

## Fase 2: Contas com username, Perfil e registro das ações

### Task 7: Username nas contas (e migração das contas de hoje)

**Files:**
- Create: `src/server/username.ts`
- Modify: `src/server/migrations.ts` (migração 5)
- Modify: `src/server/accounts.ts`:
  - `User` ganha `username` e `isPlatformAdmin`;
  - `createUser` recebe `username`;
  - a violação de unicidade distingue `EmailTakenError` de `UsernameTakenError` pelo nome do índice.
- Modify: `tests/helpers/users.ts` (`makeUser` ganha `username`, padrão `"ana"`)
- Test: `tests/unit/username.test.ts`, `tests/integration/username-migration.test.ts`, `tests/integration/accounts.test.ts`

**Interfaces:**
- Produces:
  - `normalizeUsername(text) → string` (trim + minúsculas);
  - `usernameProblem(text) → null | "usernameInvalid" | "usernameReserved"`;
  - `RESERVED_USERNAMES`;
  - `class UsernameTakenError`.

- [ ] **Step 1: Testes que falham**

```ts
// tests/unit/username.test.ts
import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameProblem } from "@/server/username";

describe("username", () => {
  it.each(["ana", "ana.silva", "ana_2", "joao-da-roca"])("%j é válido", (u) => expect(usernameProblem(u)).toBeNull());
  it.each(["ab", "a".repeat(31), "ana silva", "ána", "ana@x", "12345"])("%j é inválido", (u) =>
    expect(usernameProblem(u)).toBe("usernameInvalid"));
  it.each(["admin", "Admin", "newfarmer", "support"])("%j é reservado", (u) =>
    expect(usernameProblem(normalizeUsername(u))).toBe("usernameReserved"));
  it("guarda em minúsculas e sem espaços nas pontas", () => expect(normalizeUsername("  AnaSilva ")).toBe("anasilva"));
});
```

```ts
// tests/integration/username-migration.test.ts
it("contas antigas ganham username a partir do e-mail, sem repetir", async () => {
  const lite = new PGlite();
  const db = pgliteDb(lite, lite);
  await migrateUpTo(db, 4);
  for (const email of ["matheus@x.com", "Matheus@y.com", "ab@z.com", "admin@w.com"]) {
    await db.run(`INSERT INTO users (name,email,password_hash,city_label,latitude,longitude,country_code,climate_zone,hemisphere,created_at)
      VALUES ('M',$1,'h','C',0,0,'PT','temperate','north',0)`, [email]);
  }
  await migrate(db);
  expect((await db.query<{ username: string }>("SELECT username FROM users ORDER BY id")).map((r) => r.username))
    .toEqual(["matheus", "matheus2", "ab_user", "admin_user"]);
});
```

`migrateUpTo(db, n)` é um auxiliar exportado por `migrations.ts` só para testes: aplica até a migração `n`.

```ts
// tests/integration/accounts.test.ts (acréscimo)
it("username repetido (qualquer caixa) gera UsernameTakenError", async () => {
  const db = await testDb();
  await makeUser(db, { username: "ana" });
  await expect(makeUser(db, { username: "ANA", email: "outra@exemplo.com" })).rejects.toBeInstanceOf(UsernameTakenError);
});
```

- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**

```ts
// src/server/username.ts
import "server-only";

export const RESERVED_USERNAMES = new Set(["admin", "root", "newfarmer", "suporte", "support", "api", "login"]);
const PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(text: string): string {
  return text.trim().toLowerCase();
}

export function usernameProblem(username: string): null | "usernameInvalid" | "usernameReserved" {
  if (!PATTERN.test(username) || /^\d+$/.test(username)) return "usernameInvalid";
  if (RESERVED_USERNAMES.has(username)) return "usernameReserved";
  return null;
}
```

```sql
-- migração 5
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;
-- base: parte do e-mail antes do @, só caracteres permitidos, minúsculas
UPDATE users SET username = lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g'));
-- curto, só números ou reservado: acrescenta "_user"
UPDATE users SET username = username || '_user'
  WHERE length(username) < 3 OR username ~ '^[0-9]+$'
     OR username IN ('admin','root','newfarmer','suporte','support','api','login');
UPDATE users SET username = left(username, 30);
-- repetidos: o mais antigo fica com o nome, os seguintes ganham 2, 3…
UPDATE users u SET username = left(u.username, 28) || d.n
  FROM (SELECT id, row_number() OVER (PARTITION BY username ORDER BY id) AS n FROM users) d
  WHERE d.id = u.id AND d.n > 1;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX users_username_unique ON users (username);
```

- `createUser`: em `23505`, olha `error.constraint`. Com `users_username_unique`, lança `UsernameTakenError`; senão, `EmailTakenError`.
- **Antes de rodar no Supabase,** faça backup em Supabase → Database → Backups.
- [ ] **Step 4:** suíte inteira verde, ajustando os testes que criam usuário. Commit `feat: username único nas contas`.

### Task 8: Cadastro com e-mail + username e login só por username

**Files:**
- Modify: `src/lib/validation.ts`:
  - `signupSchema` ganha `username`, validado com as mesmas regras de `usernameProblem`. Copie o padrão para `src/lib` ou mova `usernameProblem` para `src/lib/username.ts`, porque `src/lib` não pode importar `server-only`.
  - `loginSchema` passa a ser `{ username, password }`.
- Modify: `src/server/accounts.ts`: `verifyCredentials(db, username, password)` busca por `username`. O bloqueio de 5 erros conta por username, guardado em `login_attempts.identifier` (a coluna `email` é renomeada na migração 6).
- Modify: `src/server/registration.ts` (erros `emailTaken` ou `usernameTaken`)
- Modify: `src/app/actions/auth.ts`, `src/app/(public)/cadastro/SignupForm.tsx`, `src/app/(public)/login/LoginForm.tsx`
- Modify: `src/server/email-templates.ts`: o e-mail de confirmação mostra "Seu username: ana"
- Modify: `messages/*.json`:
  - `auth.username`: "Username";
  - `auth.usernameHelp`: "3 a 30 letras minúsculas, números, ponto, hífen ou _. É com ele que você entra.";
  - `errors.usernameInvalid`, `errors.usernameReserved`, `errors.usernameTaken` ("Este username já está em uso");
  - `errors.invalidCredentials`: "Username ou senha incorretos".
- Test: `tests/unit/validation.test.ts`, `tests/integration/accounts.test.ts`, `tests/integration/registration.test.ts`, `tests/integration/sql-injection.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Testes que falham**

```ts
it("entra com username (qualquer caixa) e senha; e-mail não serve mais para entrar", async () => {
  const db = await testDb();
  await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
  expect((await verifyCredentials(db, "ANA", DEFAULT_PASSWORD)).ok).toBe(true);
  expect((await verifyCredentials(db, "ana@exemplo.com", DEFAULT_PASSWORD)).ok).toBe(false);
});

it("5 erros no mesmo username bloqueiam por 15 minutos, mesmo com a senha certa", async () => {
  const db = await testDb();
  await makeUser(db, { username: "ana" });
  for (let i = 0; i < 5; i++) await verifyCredentials(db, "ana", "errada", 1000 + i);
  expect(await verifyCredentials(db, "ana", DEFAULT_PASSWORD, 2000)).toEqual({ ok: false, reason: "locked" });
});
```

```ts
// tests/e2e/auth.spec.ts (trecho novo)
test("cadastro pede e-mail e username; login pede só username e senha", async ({ page, context }) => {
  const { username } = await signup(page, uniqueEmail());
  await clearSession(context);
  await page.goto("/login");
  await expect(page.getByLabel("E-mail")).toHaveCount(0);
  await page.getByLabel("Username").fill(username.toUpperCase());
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});
```

Acrescente também um E2E de username repetido: um segundo cadastro com o mesmo username mostra "Este username já está em uso".

- Em `tests/e2e/helpers.ts`:
  - `uniqueUsername()` devolve `ana${Date.now()}${random}`, com no máximo 30 caracteres;
  - `createAccount` e `signup` passam a preencher Username e devolvem `{ username }`;
  - todos os specs que fazem login trocam `getByLabel("E-mail")` por `getByLabel("Username")`.
- [ ] **Step 2:** rode. Esperado: FALHA.
- [ ] **Step 3: Implementação**
  - Login com dois campos: "Username" e "Senha". Abaixo, os links "Esqueci a senha" e "Esqueci o username".
  - Cadastro: Nome, E-mail, Username (com a dica), Senha, Confirmar senha, Cidade.
  - Migração 6: `ALTER TABLE login_attempts RENAME COLUMN email TO identifier;` e recria o índice como `idx_login_attempts_identifier`.
- [ ] **Step 4:** `npx vitest run`, `npx playwright test`. Commit `feat: cadastro com username e login por username e senha`.

### Task 9: Recuperar senha por username ou e-mail, e "Esqueci o username"

**Files:**
- Modify: `src/server/password-reset.ts`: `requestPasswordReset(db, mailer, { identifier, baseUrl, locale })`. Um `identifier` com `@` é e-mail; sem `@`, é username.
- Create: `src/server/username-reminder.ts` (`sendUsernameReminder(db, mailer, { email, baseUrl, locale })`)
- Modify: `src/server/email-templates.ts`: novo modelo `usernameReminderEmail`, com o mesmo visual dos outros ("Seu username no NewFarmer é ana") e o botão "Entrar", que leva a `/login`
- Create: `src/app/(public)/recuperar/username/page.tsx` e o formulário
- Modify: `src/app/(public)/recuperar/ForgotForm.tsx` (rótulo "Username ou e-mail")
- Modify: `src/app/actions/auth.ts` (as duas ações passam por `hit(recovery)`)
- Test: `tests/integration/password-reset.test.ts`, `tests/integration/username-reminder.test.ts`, `tests/unit/email-templates.test.ts`, `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Testes que falham**

```ts
it.each(["ana", "ANA", "ana@exemplo.com"])("recuperar a senha com %j envia o link para o e-mail da conta", async (identifier) => {
  const db = await testDb();
  await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
  const { sent, mailer } = captureMailer();
  await requestPasswordReset(db, mailer, { ...base, identifier });
  expect(sent.map((m) => m.to)).toEqual(["ana@exemplo.com"]);
});

it("esqueci o username: manda o username para o e-mail; e-mail sem conta não manda nada", async () => {
  const db = await testDb();
  await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
  const { sent, mailer } = captureMailer();
  await sendUsernameReminder(db, mailer, { email: "ANA@exemplo.com", baseUrl: "http://x", locale: "pt" });
  await sendUsernameReminder(db, mailer, { email: "ninguem@exemplo.com", baseUrl: "http://x", locale: "pt" });
  expect(sent).toHaveLength(1);
  expect(sent[0].html).toContain(">ana<");
});
```

- **E2E:** "Esqueci o username" → digitar o e-mail → a caixa de teste recebe "Seu username no NewFarmer". A tela mostra a mesma mensagem para e-mail com e sem conta.
- [ ] **Step 2–4:** implemente, registre `auth.passwordReset` e `auth.usernameReminder` (acrescente esta ação ao tipo `ActivityAction`). Rode e veja verde.
- [ ] **Step 5:** commit `feat: recuperar senha por username ou e-mail e lembrete de username`.

### Task 10: Registro de todas as ações e Perfil só da própria conta

**Files:**
- Modify: todas as ações listadas em "Registro de atividades" nos Global Constraints, que passam a chamar `logActivity`:
  - `src/app/actions/auth.ts`, `diary.ts`, `farm.ts`, `profile.ts`, `verification.ts`;
  - a página `/confirmar/[token]`.
- Modify: `src/app/(app)/perfil/page.tsx`: mostra também o username, só leitura
- Modify: `src/app/actions/profile.ts`: edita só a conta de `requireUser().id` e nunca lê id de conta do formulário
- Test: `tests/integration/activity-log.test.ts`, `tests/e2e/profile.spec.ts`

- [ ] **Step 1: Testes que falham**
  - **Integration:** login certo, login errado, diário criado e senha trocada geram cada um uma linha com `action`, `userId` e `target` esperados. Chame as funções do servidor que as ações usam.
  - **E2E:** o usuário A manda o formulário de perfil adulterado, com um campo extra `userId` de B. Só A muda, e B continua igual.
- [ ] **Step 2:** acrescente `logActivity` em cada ação, com o IP vindo de `clientIp()`. Nada de senha, token ou texto do diário nos `details`: guarde só o animal e o tipo.
- [ ] **Step 3:** suíte inteira e robô verdes. Commit `feat: registro das ações e perfil restrito à própria conta`.

---

## Fase 3: Páginas públicas e legais

### Task 11: Página inicial com CTA, 404 e títulos de página

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
| Settings → Activity logs | Activity logs |
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
  await page.getByRole("banner").getByRole("link", { name: "Criar conta grátis" }).click();
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
  - Topo fixo com logo, "Entrar" (link discreto) e **"Criar conta grátis"** (botão primário).
  - Seção principal: "Seu guia para a vida no campo" e o mesmo botão.
  - 3 cartões: Animais, Plantações, Clima.
  - Rodapé com Privacidade e Termos.
  - Quem já está logado é levado ao `/painel`.
  - 404: ilustração simples (🌾), título, texto e "Voltar ao início" (`/` ou `/painel` se logado), com idioma e tema da pessoa.
- [ ] **Step 4:** robô verde. Commit `feat: página inicial com CTA, 404 e títulos de página`.

### Task 12: Aviso de cookies

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

### Task 13: Política de Privacidade e Termos de Uso

**Depende de:** respostas do bloco "Antes de começar".

**Files:**
- Create: `src/app/(marketing)/privacidade/page.tsx`, `src/app/(marketing)/termos/page.tsx`
- Create: `content/legal/privacy.{pt,en}.md` e `content/legal/terms.{pt,en}.md`, mostrados como texto simples com títulos (um conversor mínimo de `#`, `##`, parágrafos e listas)
- Modify: `src/app/(public)/cadastro/SignupForm.tsx` (caixa de aceite com links e caixa "Tenho 13 anos ou mais")
- Test: `tests/e2e/pages.spec.ts`

**Conteúdo mínimo da Política (LGPD, RGPD e EUA):**
1. responsável e contato;
2. dados recolhidos:
   - conta: nome, username, e-mail, senha guardada só embaralhada;
   - da sua criação: cidade e coordenadas, animais, plantações, diário;
   - técnicos: IP e data das ações, cookies essenciais;
3. finalidades e base legal (execução do contrato, interesse legítimo em segurança; na LGPD, art. 7º, V e IX);
4. fornecedores e onde ficam os dados:
   - Supabase, Irlanda (UE);
   - Vercel, servidores na UE ou nos EUA com cláusulas contratuais-padrão;
   - Resend (envio de e-mail);
   - Open-Meteo (recebe só coordenadas arredondadas, sem dado pessoal);
5. prazos:
   - conta enquanto ativa;
   - registros de atividade por 180 dias;
   - limites de tentativas por 1 dia;
6. direitos e como pedir, pelo e-mail de contato, com resposta em até 15 dias (LGPD) / 30 dias (RGPD) / 45 dias (CCPA):
   - **Brasil (LGPD):** confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento, revogação do consentimento; reclamação à **ANPD**;
   - **UE (RGPD):** acesso, retificação, apagamento, limitação, portabilidade, oposição; reclamação à autoridade do país (ex.: **CNPD** em Portugal);
   - **EUA (CCPA/CPRA e leis estaduais parecidas):** saber, apagar, corrigir, não ser discriminado por exercer direitos; o NewFarmer **não vende nem compartilha** dados pessoais para publicidade comportamental e não usa dados sensíveis para inferir características, por isso não há link "Do Not Sell or Share";
7. cookies (lista dos 4 e para que servem);
8. crianças: o serviço não é para menores de 13 anos (COPPA), e conta descoberta de menor de 13 anos é apagada;
9. transferência internacional: dados podem ser tratados no Brasil, na UE e nos EUA, com as salvaguardas dos fornecedores (cláusulas contratuais-padrão);
10. data da última atualização.

**Termos:**
1. o que o serviço é e o que não é: orientação geral, não substitui veterinário nem agrônomo; leis de registro de animais variam e devem ser confirmadas com o órgão oficial;
2. conta: pessoal e intransferível; a pessoa responde pelo que faz com ela e deve ter 13 anos ou mais;
3. uso proibido;
4. disponibilidade sem garantia;
5. encerramento da conta;
6. lei e foro: lei brasileira, foro de Jundiaí/SP, sem afastar direitos que a lei do país do usuário (UE, EUA) não deixa afastar;
7. contato.

- [ ] **Step 1: E2E que falha.**
  - As duas páginas abrem, nos dois idiomas, com o título certo.
  - O cadastro sem marcar o aceite mostra o erro "Para criar a conta, aceite os Termos e a Política de Privacidade".
  - O cadastro sem marcar "Tenho 13 anos ou mais" mostra "O NewFarmer é para maiores de 13 anos".
- [ ] **Step 2:** escreva os textos e as páginas. Peça ao usuário para revisar os textos antes do commit.
- [ ] **Step 3:** commit `feat: política de privacidade, termos de uso e aceite no cadastro`.

---

## Fase 4: Settings do dono do site

### Task 14: Settings do dono do site: Activity logs e Monitoramento

**Files:**
- Create: `src/server/monitoring.ts`, `src/server/authz.ts` (`requirePlatformAdmin()`: quem não é dono do site recebe 404)
- Create: `src/app/(app)/settings/layout.tsx` (abas Activity logs | Monitoramento)
- Create: `src/app/(app)/settings/activity/page.tsx`:
  - tabela com quando, quem (username), o que (texto traduzido de cada `ActivityAction`), alvo e IP;
  - filtros por username e por tipo de ação;
  - "Carregar mais", com `before` igual à data do último item;
- Create: `src/app/(app)/settings/monitoramento/page.tsx`
- Create: `src/instrumentation.ts` (`onRequestError` grava em `error_logs`: rota, mensagem curta, hora; nunca o corpo do pedido)
- Modify: `src/server/migrations.ts` (migração 7: `error_logs` com RLS)
- Modify: `src/components/UserMenu.tsx` (item "Settings" logo abaixo de "Perfil" se `user.isPlatformAdmin`)
- Modify: `src/middleware.ts` (matcher inclui `/settings/:path*`)
- Modify: `docs/deploy.md`. Explica como se tornar dono do site, no SQL Editor do Supabase:
  `UPDATE users SET is_platform_admin = TRUE WHERE email = 'seu@email';`
  Não há tela para isso, de propósito.
- Test: `tests/integration/monitoring.test.ts`, `tests/e2e/monitoring.spec.ts`

**Interfaces:**
- Produces: `getPlatformStats(db, now) → { users, newUsers7d, activeSessions, logins24h: { ok, failed }, lockedAccounts, rateLimited24h, errors24h, recentErrors: { at, route, message }[], dbLatencyMs, weatherCacheEntries }`.

- [ ] **Step 1: Testes que falham**
  - Com 3 contas, 1 login certo e 2 errados nas últimas 24 h, `getPlatformStats` devolve esses números.
  - O E2E confirma que um usuário comum não vê "Settings" no menu e recebe 404 em `/settings/activity` e `/settings/monitoramento`.
  - O E2E também liga `is_platform_admin` num usuário de teste (direto no banco PGlite do robô, por um endpoint só de desenvolvimento ou um script) e confirma que ele vê as duas abas.
- [ ] **Step 2:** `rateLimited24h` precisa de registro: `hit()` passa a gravar `logActivity(… action: "security.rateLimited")` quando bloqueia, com `userId` da conta se houver. A ação já está no tipo `ActivityAction` desde a Task 6.
- [ ] **Step 3: Tela**
  - Cartões com contas (total e novas em 7 dias), sessões ativas, logins nas 24 h (certos/errados), contas bloqueadas, bloqueios por excesso, erros nas 24 h e tempo de resposta do banco.
  - Tabela com os últimos 50 erros.
  - Botão "Atualizar".
  - Só leitura, com `requirePlatformAdmin()` (404 para os outros).
  - Monitoramento não mostra e-mails, nomes nem dados das criações: só números. Activity logs mostra o username, que é necessário para investigar.
- [ ] **Step 4:** commit `feat: Settings do dono do site com Activity logs e Monitoramento`.

---

## Verificação final (depois da Task 14)

- [ ] `npx vitest run`, `npx playwright test` e `npm run build`: tudo verde.
- [ ] Migração no Supabase:
  - backup;
  - rodar o site uma vez com o `.env.local`, para aplicar as migrações;
  - conferir que a conta real (matheusps70@hotmail.com) ganhou username (esperado: `matheusps70`), mantendo cidade, animais e diário;
  - ligar `is_platform_admin` nela e mandar o username ao usuário.
- [ ] `curl -I` no site da Vercel: cabeçalhos de segurança presentes e sem `X-Powered-By`.
- [ ] `/dev/inbox` online dá 404.
- [ ] RevisionCheck (5 revisores) e mp-code-review contra este plano.
