# Etapa 7: rotas em inglês, SEO, assinatura Stripe, onboarding, landing e Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o NewFarmer em produto vendável: rotas em inglês, boa indexação no Google, assinatura obrigatória via Stripe com onboarding, landing page com imagens reais do sistema, rastreio de páginas com consentimento e um Admin para assinaturas, leads e e-mail marketing.

**Architecture:** Next.js 15 App Router + Postgres (pg/PGlite), padrão já usado no projeto. Stripe via `fetch` na API REST (como o Resend em `src/server/mailer.ts`), sem SDK; webhook com verificação HMAC feita à mão. Interface `PaymentProvider` com implementação real e falsa (`STRIPE_FAKE=1` nos testes, como `WEATHER_FAKE`). Rastreio de páginas só com consentimento (cookie `nf_consent=all`), tabela `page_views`. Admin em `/admin`, só para `is_platform_admin` (404 para os outros, `requirePlatformAdmin()`).

**Tech Stack:** Next.js 15.5, React 19, TypeScript, Tailwind v4, next-intl (cookie `nf_locale`), zod, Vitest + PGlite, Playwright (workers 1, dev server porta 3100), Resend, Stripe REST.

## Global Constraints

- Idioma padrão: inglês (`resolveLocale` já devolve `en` sem cookie). Textos novos sempre em `messages/pt.json` e `messages/en.json`.
- Todas as rotas em inglês (tabela da Task 1). Rotas antigas redirecionam com 308 permanente.
- Preço único mensal, sem teste grátis: **R$ 6,99** (BRL, país BR), **€ 1,99** (EUR, países da Europa), **US$ 2,00** (USD, resto do mundo). Valores em centavos: BRL 699, EUR 199, USD 200.
- Moeda decidida pelo país da cidade da conta (`users.country_code`); na landing (sem conta), pelo cabeçalho `x-vercel-ip-country`; sem cabeçalho, USD.
- Sem assinatura ativa, a pessoa só acessa: `/welcome`, `/subscribe*`, `/profile` (baixar dados e apagar conta precisam continuar abertos por lei) e sair. O dono do site (`is_platform_admin`) nunca é bloqueado.
- Status do Stripe que liberam acesso: `active`, `trialing`, `past_due`.
- Nenhuma chave em arquivo do repositório: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BRL`, `STRIPE_PRICE_EUR`, `STRIPE_PRICE_USD` só como variáveis de ambiente (documentar em `docs/deploy.md`).
- Rastreio de páginas só com consentimento `nf_consent=all`. Sem consentimento, nada é gravado em `page_views` e o cookie `nf_vid` não é criado. `page_views` não guarda IP.
- E-mail marketing só para quem marcou o opt-in (caixa desmarcada por padrão no cadastro e alterável no Perfil) e não se descadastrou. Todo e-mail de marketing tem link de descadastro de um clique e cabeçalho `List-Unsubscribe`.
- Admin mostra nome, e-mail, username, cidade, país, animais, plantações, assinatura e páginas visitadas. **Não** mostra diário nem senha. Cada abertura do detalhe de um assinante gera `admin.viewedUser` no registro de atividade.
- Sem dependências novas no `package.json`.
- Toda tabela nova com `ENABLE ROW LEVEL SECURITY`; migrações novas continuam numeradas em `src/server/migrations.ts` (a próxima é a 10).
- Touch targets ≥ 44 px no celular, foco visível, funciona em 320 px de largura sem rolagem horizontal.
- Testes: cada task deixa `npx tsc --noEmit`, `npx vitest run` e os testes do robô que tocou passando. A verificação final roda tudo + `npm run build`.

---

## Task 1: Rotas em inglês, redirecionamentos e base de SEO

**Files:**
- Move (git mv) as pastas de página conforme a tabela; atualizar todos os `href`, `redirect()`, `revalidatePath`, links de e-mail (`src/server/password-reset.ts`, `email-verification.ts`, `username-reminder.ts`), `src/middleware.ts` (matcher), `public/sw.js` não muda, `src/app/(app)/layout.tsx` (`offlinePaths`), conteúdo legal (`content/legal/*.md` links), testes (`tests/e2e/*`, `tests/integration/*`).
- Modify: `next.config.ts` (`redirects()`), `src/app/layout.tsx` (metadata base), `src/app/(app)/layout.tsx` (robots noindex).
- Create: `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/(marketing)/pt/page.tsx`, `src/app/(marketing)/pt/privacy/page.tsx`, `src/app/(marketing)/pt/terms/page.tsx`.
- Modify: `src/i18n/request.ts` (cabeçalho `x-nf-locale` vence o cookie), `src/middleware.ts` (em `/pt` e `/pt/*`: põe `x-nf-locale: pt` no request e grava o cookie `nf_locale=pt` se não houver).

| Antes | Depois |
|---|---|
| `/cadastro` | `/register` |
| `/painel` | `/dashboard` |
| `/animais`, `/animais/[id]` | `/animals`, `/animals/[id]` |
| `?aba=diario` | `?tab=diary` |
| `/plantacoes`, `/plantacoes/[id]` | `/crops`, `/crops/[id]` |
| `/clima` | `/weather` |
| `/perfil` | `/profile` |
| `/boas-vindas` | `/welcome` |
| `/recuperar` | `/forgot-password` |
| `/recuperar/username` | `/forgot-username` |
| `/recuperar/[token]` | `/reset-password/[token]` |
| `/confirmar/[token]` | `/confirm-email/[token]` |
| `/privacidade`, `/termos` | `/privacy`, `/terms` |
| `/settings`, `/settings/activity`, `/settings/monitoramento` | `/admin`, `/admin/activity`, `/admin/monitoring` (Tasks 6 e 7 completam o Admin) |
| `/api/conta/dados` | `/api/account/data` |
| `/login`, `/myfarm`, `/dev/inbox` | sem mudança |
| `#plantacoes`, `#animais` (âncoras do MyFarm) | `#crops`, `#animals` |

`next.config.ts`:

```ts
async redirects() {
  return [
    { source: "/cadastro", destination: "/register", permanent: true },
    { source: "/painel", destination: "/dashboard", permanent: true },
    { source: "/animais/:id?", destination: "/animals/:id?", permanent: true },
    { source: "/plantacoes/:id?", destination: "/crops/:id?", permanent: true },
    { source: "/clima", destination: "/weather", permanent: true },
    { source: "/perfil", destination: "/profile", permanent: true },
    { source: "/boas-vindas", destination: "/welcome", permanent: true },
    { source: "/recuperar/username", destination: "/forgot-username", permanent: true },
    { source: "/recuperar/:token", destination: "/reset-password/:token", permanent: true },
    { source: "/recuperar", destination: "/forgot-password", permanent: true },
    { source: "/confirmar/:token", destination: "/confirm-email/:token", permanent: true },
    { source: "/privacidade", destination: "/privacy", permanent: true },
    { source: "/termos", destination: "/terms", permanent: true },
    { source: "/settings/monitoramento", destination: "/admin/monitoring", permanent: true },
    { source: "/settings/:path*", destination: "/admin/:path*", permanent: true },
  ];
}
```

(A ordem importa: `/recuperar/username` antes de `/recuperar/:token`. Links antigos em e-mails já enviados continuam funcionando.) O `?aba=diario` antigo: a página `/animals/[id]` aceita `tab=diary` **ou** `aba=diario`.

SEO base:
- `src/app/layout.tsx`: `metadataBase: new URL(process.env.APP_URL ?? "https://newfarmer.vercel.app")`, `description` traduzida (`meta.description`), `openGraph` (`siteName: "NewFarmer"`, `type: "website"`), `twitter: { card: "summary_large_image" }`.
- `src/app/(app)/layout.tsx` e `(public)` (login, register, forgot..., confirm, reset): `export const metadata = { robots: { index: false, follow: false } }` (área logada e formulários não entram no Google; `/register` **entra**: deixe index em `/register` e `/login`).
- Páginas de marketing: `alternates: { canonical, languages: { en: "/", pt: "/pt", "x-default": "/" } }` (e o equivalente para privacy/terms).
- `robots.ts`: allow `/`, disallow `/api/`, `/admin`, `/dashboard`, `/animals`, `/crops`, `/weather`, `/profile`, `/myfarm`, `/welcome`, `/subscribe`, `/dev/`; `sitemap: <APP_URL>/sitemap.xml`.
- `sitemap.ts`: `/`, `/pt`, `/privacy`, `/pt/privacy`, `/terms`, `/pt/terms`, `/register`, `/login`, com `alternates.languages`.
- As páginas `/pt/*` apenas reexportam a página em inglês (`export { default, generateMetadata } from "../page"`); o idioma vem do cabeçalho posto pelo middleware.

- [ ] **Step 1:** `git mv` das pastas; corrigir importações relativas.
- [ ] **Step 2:** substituir todas as referências (use `grep -rn` para cada rota antiga em `src tests content messages`); só sobra rota antiga dentro de `redirects()` e do teste de redirecionamento.
- [ ] **Step 3:** teste e2e novo `tests/e2e/routes-seo.spec.ts`:
  - cada rota antiga da tabela responde 308 para a nova (`page.request.get(old, { maxRedirects: 0 })`);
  - `/pt` mostra a landing em português sem cookie de idioma (use `test.use({ storageState: { cookies: [], origins: [] } })`), e `/` sem cookie mostra inglês;
  - `/robots.txt` contém `Disallow: /admin` e `Sitemap:`; `/sitemap.xml` contém `/pt/privacy`;
  - `/dashboard` logado tem `<meta name="robots" content="noindex, nofollow">`; `/` não tem.
- [ ] **Step 4:** rodar `npx tsc --noEmit`, `npx vitest run`, `npx playwright test`.
- [ ] **Step 5:** commit `feat: rotas em inglês com redirecionamento das antigas e base de SEO`.

## Task 2: Consentimento de cookies e registro de páginas visitadas

**Files:**
- Modify: `src/lib/cookies.ts` (`CONSENT_COOKIE = "nf_consent"`, `VISITOR_COOKIE = "nf_vid"`; `COOKIE_NOTICE_COOKIE` sai — quem já tem `nf_cookie_notice=1` é tratado como "só essenciais"), `src/components/CookieNotice.tsx`, `src/app/layout.tsx`, `playwright.config.ts` (storageState passa a ter `nf_consent=essential`), `tests/e2e/helpers.ts` (`clearSession`).
- Create: `src/components/PageTracker.tsx`, `src/app/api/track/route.ts`, `src/server/page-views.ts`, migração 10 (parte `page_views`).
- Modify: `src/server/activity-log.ts` `purgeOld` (apaga `page_views` com mais de 180 dias), `src/server/registration.ts` ou `signupAction` (liga as visitas do visitante à conta nova), `src/server/account-data.ts` (`exportUserData` inclui `pageViews`).
- Test: `tests/integration/page-views.test.ts`, `tests/e2e/consent.spec.ts`.

**Interfaces:**
- Produces: `recordPageView(db, { visitorId: string; userId: number | null; path: string; referrer: string }, now?)`, `linkVisitorToUser(db, visitorId, userId)`, `listUserPageViews(db, userId, limit = 200)`, `leadFunnel(db, sinceMs)` (usada na Task 8), constante `FUNNEL_STEPS = ["/", "/register", "/welcome", "/subscribe", "paid"] as const`.

Migração 10 (todas as tabelas da etapa entram nela, cada task acrescenta o seu pedaço **na mesma migração 10** antes do primeiro deploy; ela ainda não existe em produção):

```sql
CREATE TABLE page_views (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  referrer TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_page_views_visitor ON page_views (visitor_id, created_at);
CREATE INDEX idx_page_views_user ON page_views (user_id, created_at);
CREATE INDEX idx_page_views_created ON page_views (created_at);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
```

Regras:
- Aviso de cookies com dois botões do mesmo tamanho e destaque: **"Aceitar todos"** (`nf_consent=all`) e **"Só essenciais"** (`nf_consent=essential`), mais link da Política. Rodapé da landing e Perfil têm "Preferências de cookies", que reabre o aviso (apagar o cookie `nf_consent` e recarregar basta).
- `PageTracker` (cliente, no root layout): se `nf_consent=all`, garante `nf_vid` (UUID, 1 ano, `SameSite=Lax`) e, a cada mudança de `usePathname()`, envia `navigator.sendBeacon("/api/track", JSON.stringify({ path, referrer }))`. Mudar para "só essenciais" apaga `nf_vid`.
- `/api/track` (POST): lê `nf_consent` e `nf_vid` dos cookies **no servidor**; sem `all` ou sem `nf_vid` válido (UUID) responde 204 sem gravar. `path` precisa começar com `/`, até 200 caracteres, sem query string (corta no `?`: tokens de e-mail nunca são gravados) e nunca começa com `/api/`, `/admin`, `/confirm-email/`, `/reset-password/`. `referrer`: só o host (`new URL(ref).host`), até 100 caracteres. `userId` vem da sessão (`getCurrentUser()`), nunca do corpo. Rate limit `limitByIp(db, "track", ip)` com `track: { limit: 120, windowMs: 60_000 }` em `RATE_LIMITS`.
- No cadastro com sucesso, `linkVisitorToUser(db, cookie nf_vid, userId)` (`UPDATE page_views SET user_id = $2 WHERE visitor_id = $1 AND user_id IS NULL`).

- [ ] **Step 1:** testes de integração (falham primeiro):
  - grava e lista as visitas de uma conta da mais antiga para a mais nova;
  - `linkVisitorToUser` liga só as visitas sem dono daquele visitante;
  - `purgeOld` apaga visitas com mais de 180 dias e mantém as recentes;
  - `leadFunnel` conta visitantes distintos que chegaram a cada passo (com 3 visitantes: um só na `/`, um até `/register`, um até `/subscribe` → `{ "/": 3, "/register": 2, "/welcome": 1, "/subscribe": 1, paid: 0 }`; `paid` = visitantes ligados a contas com assinatura que libera acesso — tabela `subscriptions` da Task 3; até lá a função usa `0` e a Task 3 completa).
- [ ] **Step 2:** implementar; e2e `consent.spec.ts`: sem consentimento, navegar 3 páginas não grava nada (conferir pela rota de dev `GET /api/dev/page-views?visitor=` **ou** por uma consulta exposta só com `E2E=1`, no padrão de `/api/dev/make-admin`); com "Aceitar todos", grava as 3 com o caminho sem query; "Só essenciais" depois não grava mais.
- [ ] **Step 3:** commit `feat: aviso de cookies com escolha e registro de páginas com consentimento`.

## Task 3: Stripe: cliente, preços por país, webhook e sincronização

**Files:**
- Create: `src/lib/pricing.ts`, `src/server/payments/types.ts`, `src/server/payments/stripe.ts`, `src/server/payments/fake.ts`, `src/server/payments/index.ts` (`getPaymentProvider()`), `src/server/subscriptions.ts`, `src/app/api/stripe/webhook/route.ts`.
- Modify: migração 10 (parte assinatura), `src/server/account-data.ts` (`deleteAccount` cancela a assinatura antes de apagar; `exportUserData` inclui `subscription`), `next.config.ts` (CSP `form-action 'self' https://checkout.stripe.com https://billing.stripe.com`), `docs/deploy.md`.
- Test: `tests/unit/pricing.test.ts`, `tests/integration/stripe-webhook.test.ts`, `tests/integration/subscriptions.test.ts`, `tests/integration/stripe-client.test.ts` (com `fetch` falso, no padrão de `createResendMailer(apiKey, from, fetchFn)`).

**Interfaces:**
- `src/lib/pricing.ts` (cliente e servidor):

```ts
export type Currency = "brl" | "eur" | "usd";
export const PRICES: Record<Currency, number> = { brl: 699, eur: 199, usd: 200 }; // centavos por mês
// UE + EEE + demais países europeus
const EUROPE = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","CH","GB","AD","MC","SM","VA","AL","BA","ME","MK","RS","MD","UA","XK"]);
export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").toUpperCase();
  return c === "BR" ? "brl" : EUROPE.has(c) ? "eur" : "usd";
}
export function formatPrice(currency: Currency, locale: "pt" | "en"): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(PRICES[currency] / 100);
}
```

- `PaymentProvider`:

```ts
export interface PaymentProvider {
  createCustomer(input: { email: string; name: string; userId: number }): Promise<string>; // customer id
  createCheckout(input: { customerId: string; priceId: string; userId: number; locale: "pt" | "en"; successUrl: string; cancelUrl: string }): Promise<string>; // url
  getCheckout(sessionId: string): Promise<{ customerId: string; subscription: StripeSubscription | null }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<string>; // url
  cancelNow(subscriptionId: string): Promise<void>;
}
export type StripeSubscription = { id: string; customer: string; status: string; currency: string; amount: number; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean; canceledAt: number | null };
```

- Stripe real: `fetch("https://api.stripe.com/v1/...")` com `Authorization: Bearer ${STRIPE_SECRET_KEY}` e corpo `application/x-www-form-urlencoded` (`URLSearchParams`; campos aninhados como `line_items[0][price]`, `subscription_data[metadata][user_id]`). Checkout: `mode=subscription`, `client_reference_id=<userId>`, `locale=pt-BR|en`, `line_items[0][quantity]=1`. `getCheckout`: `GET /v1/checkout/sessions/{id}?expand[]=subscription`. `currentPeriodEnd`: `sub.current_period_end ?? sub.items.data[0].current_period_end` (versões novas da API mudaram o campo), em segundos → converter para ms. Erro HTTP vira `throw new Error("Stripe respondeu <status>")` sem copiar o corpo (pode ter dado pessoal).
- `getPaymentProvider()`: `STRIPE_FAKE=1` fora de produção → fake; senão exige `STRIPE_SECRET_KEY` (sem ela, lança erro claro). Price id por moeda: `process.env[`STRIPE_PRICE_${currency.toUpperCase()}`]`.
- Fake: `createCheckout` devolve `${successUrl}` com `session_id=fake_<userId>`; `getCheckout("fake_<id>")` devolve assinatura `active` em BRL/EUR/USD conforme o país, período de 30 dias.
- `src/server/subscriptions.ts`: `getSubscription(db, userId)`, `upsertSubscription(db, userId, customerId, sub: StripeSubscription | null)`, `userIdForCustomer(db, customerId)`, `hasAccess(user: { isPlatformAdmin: boolean }, sub)` → `true` para admin ou `status ∈ {active, trialing, past_due}`, `ensureCustomer(db, provider, user)` (cria e guarda se não existir).
- Webhook `POST /api/stripe/webhook`:

```ts
// Stripe-Signature: t=<segundos>,v1=<hex>[,v1=...]; assinatura = HMAC-SHA256(secret, `${t}.${corpoCru}`)
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header) return false;
  const parts = Object.groupBy(header.split(",").map((p) => p.split("=") as [string, string]), ([k]) => k);
  const t = Number(parts.t?.[0]?.[1]);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return (parts.v1 ?? []).some(([, sig]) => {
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
```

  (Se `Object.groupBy` não existir no alvo do TypeScript, faça o mesmo com um laço.) Lê `await request.text()`, confere a assinatura **antes** de abrir o banco (401 se falhar), ignora evento repetido (`INSERT INTO stripe_events (id, received_at) ... ON CONFLICT DO NOTHING RETURNING id`), trata `customer.subscription.created|updated|deleted` (objeto da assinatura → `upsertSubscription` pelo `customer`) e responde 200 para qualquer outro tipo. Evento de cliente desconhecido: 200 sem gravar.
- Migração 10, parte assinatura:

```sql
CREATE TABLE subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'none',
  currency TEXT, amount INTEGER,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  started_at BIGINT, canceled_at BIGINT,
  updated_at BIGINT NOT NULL
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TABLE stripe_events (id TEXT PRIMARY KEY, received_at BIGINT NOT NULL);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
```

  `purgeOld` apaga `stripe_events` com mais de 30 dias.
- Apagar conta: se houver `stripe_subscription_id` com status que libera acesso, `cancelNow` antes do `DELETE`; se o Stripe falhar, **não** apaga e devolve `"paymentError"` (mensagem: "Não foi possível cancelar a assinatura agora. Tente de novo em alguns minutos."). Registra `account.deleted` como antes.
- `ActivityAction` ganha `billing.checkoutStarted`, `billing.subscriptionChanged`, `admin.viewedUser`, `marketing.optInChanged`, `marketing.campaignSent`, com textos em `messages/*.json` `activity.*`.

- [ ] **Step 1:** testes (falham primeiro):
  - `pricing`: BR→brl, PT/DE/GB→eur, US/AR/null→usd; `formatPrice("brl","pt")` = "R$ 6,99" (com espaço inseparável; compare com `.replace(/\s/g, " ")`), `formatPrice("eur","en")` = "€1.99", `formatPrice("usd","en")` = "$2.00".
  - `verifyStripeSignature`: aceita assinatura certa; recusa corpo alterado, segredo errado, horário com mais de 5 min e cabeçalho vazio.
  - webhook: `customer.subscription.updated` assinado grava status, moeda, valor e fim do período; o mesmo `event.id` duas vezes grava uma; assinatura inválida → 401 e nada gravado; `deleted` deixa `status='canceled'` e `canceled_at`.
  - `hasAccess`: admin sempre; `active`/`trialing`/`past_due` sim; `canceled`/`incomplete`/sem linha não.
  - cliente Stripe com `fetch` falso: `createCheckout` manda `mode=subscription`, `line_items[0][price]`, `client_reference_id`, cabeçalho `Authorization`; resposta 400 lança erro sem o corpo.
  - apagar conta com assinatura ativa chama `cancelNow`; com o provedor lançando erro, a conta continua existindo.
- [ ] **Step 2:** implementar e passar.
- [ ] **Step 3:** `docs/deploy.md`: seção "Stripe" (criar conta; produto "NewFarmer" com 3 preços mensais recorrentes BRL 6,99 / EUR 1,99 / USD 2,00; copiar os `price_...`; webhook `https://<site>/api/stripe/webhook` com os eventos `customer.subscription.created`, `.updated`, `.deleted`; ativar o Customer Portal com cancelamento; as 5 variáveis só em Production; testar primeiro com as chaves de teste `sk_test_`). Avisos: plano Pro da Vercel para uso comercial; IVA (OSS) para vender na UE e tributação no Brasil — falar com um contador.
- [ ] **Step 4:** commit `feat: assinatura Stripe com preços por país e webhook verificado`.

## Task 4: Onboarding e bloqueio sem assinatura

**Files:**
- Create: `src/app/(app)/subscribe/page.tsx`, `src/app/(app)/subscribe/success/page.tsx`, `src/app/actions/billing.ts`, `src/components/OnboardingSteps.tsx`.
- Modify: `src/app/(app)/welcome/page.tsx`, `src/app/actions/farm.ts` (`saveFarmAndContinueAction` → `redirect("/subscribe")`), `src/app/actions/auth.ts` (depois do login, sem acesso → `/subscribe`), `src/app/(app)/layout.tsx` (bloqueio), `src/app/(app)/profile/page.tsx` (cartão "Assinatura"), `tests/e2e/helpers.ts`, `playwright.config.ts` (`STRIPE_FAKE: "1"`).

**Interfaces:**
- Consumes: `getPaymentProvider`, `ensureCustomer`, `getSubscription`, `upsertSubscription`, `hasAccess`, `currencyForCountry`, `formatPrice` (Task 3).
- Produces: `startCheckoutAction(): Promise<void>` (redirect para o Stripe), `openPortalAction(): Promise<void>`.

Fluxo:
1. `/register` (conta) → `/welcome` (sua criação: o `FarmForm` atual, com "Pular por enquanto" levando a `/subscribe`) → `/subscribe` (assinatura) → Stripe Checkout → `/subscribe/success?session_id=...` → `/dashboard`.
2. `OnboardingSteps` mostra os 3 passos ("Conta", "Sua criação", "Assinatura") com o atual marcado (`aria-current="step"`), em `/welcome` e `/subscribe`.
3. `/subscribe`: título "Assine o NewFarmer", preço no formato `formatPrice(currencyForCountry(user.countryCode), locale)` + "/mês", lista do que inclui (guias dos animais, calendário de plantio do seu clima, previsão de 5 dias com chuva em mm, diário por animal, funciona sem internet), aviso "Cobrança mensal recorrente. Cancele quando quiser no Perfil." e o direito de arrependimento ("Reembolso integral se pedir em até 7 dias (Brasil) ou 14 dias (União Europeia) depois da primeira cobrança."), botão "Assinar por R$ 6,99/mês" (`startCheckoutAction`), link "Termos" e "Política". Quem já tem acesso é mandado para `/dashboard`.
4. `startCheckoutAction`: `requireUser`, `limitWrites`, `ensureCustomer`, `createCheckout` com `successUrl = ${APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}` (literal do Stripe), `cancelUrl = ${APP_URL}/subscribe`, loga `billing.checkoutStarted` com `{ currency }`, `redirect(url)`.
5. `/subscribe/success`: `getCheckout(session_id)`; só aceita se `customerId` for o da conta logada (senão ignora e manda para `/subscribe`); `upsertSubscription`; com acesso → `/dashboard`; ainda não → texto "Pagamento recebido, liberando sua conta…" e recarrega em 3 s (`<meta http-equiv="refresh" content="3">`).
6. Bloqueio no `(app)/layout.tsx`: a pathname vem do cabeçalho `x-nf-path` posto pelo middleware (acrescentar no `middleware.ts`). Sem `hasAccess` e fora de `/welcome`, `/subscribe*`, `/profile` → `redirect("/subscribe")`. A barra de navegação some nessas telas de onboarding (só logo, Sair e Perfil).
7. Perfil, cartão "Assinatura": status traduzido ("Ativa", "Pagamento pendente", "Cancelada", "Sem assinatura"), próxima cobrança ou "Acesso até <data>" se `cancel_at_period_end`, botão "Gerenciar ou cancelar" (`openPortalAction`) quando houver cliente Stripe; sem assinatura, botão para `/subscribe`. Admin vê "Conta do dono: sem cobrança".

- [ ] **Step 1:** e2e `tests/e2e/billing.spec.ts` (com `STRIPE_FAKE=1`):
  - cadastro → `/welcome` mostra o passo 2 de 3 → continuar → `/subscribe` mostra "R$ 6,99" para cidade no Brasil (Curitiba) e "€1.99"/"1,99 €" para Lisboa → assinar → volta em `/dashboard`;
  - sem assinar, abrir `/dashboard`, `/animals`, `/weather` manda para `/subscribe`; `/profile` abre;
  - `/subscribe/success?session_id=fake_<outro id>` não libera a conta;
  - Perfil mostra "Ativa" e o botão "Gerenciar ou cancelar".
- [ ] **Step 2:** `tests/e2e/helpers.ts`: `signup()` passa pelo `/subscribe` e clica em assinar (fake) até o `/dashboard`; `createAccount()` continua parando em `/welcome`. Testes que esperavam `/painel` depois do "Pular por enquanto" passam a esperar `/subscribe`.
- [ ] **Step 3:** implementar; rodar todos os e2e.
- [ ] **Step 4:** commit `feat: onboarding em 3 passos e acesso só com assinatura`.

## Task 5: Opt-in de marketing, descadastro e templates de e-mail

**Files:**
- Modify: migração 10 (parte marketing), `src/app/(public)/register/SignupForm.tsx` (caixa desmarcada "Quero receber novidades e ofertas do NewFarmer por e-mail"), `src/lib/validation.ts` (`signupSchema.marketing` boolean opcional), `src/server/registration.ts`/`accounts.ts` (grava `marketing_opt_in` e `marketing_opt_in_at`), `src/app/(app)/profile/page.tsx` (caixa liga/desliga, ação `saveMarketingAction`, log `marketing.optInChanged`), `src/server/mailer.ts` (`MailMessage.headers?: Record<string,string>`, repassado ao Resend em `headers`; `MailMessage.from?: string`; `reply_to` = `process.env.MAIL_REPLY_TO` quando existir, em todo e-mail; e-mails de marketing usam `from: process.env.MAIL_MARKETING_FROM ?? MAIL_FROM`, os de conta continuam com `MAIL_FROM`; teste com `fetch` falso confere `reply_to` e o remetente de marketing, e que sem as variáveis nada muda), `src/server/account-data.ts` (exporta `marketingOptIn`).
- Create: `src/server/marketing.ts`, `src/server/marketing-templates.ts`, `src/app/(public)/unsubscribe/[token]/page.tsx`, `src/app/api/unsubscribe/[token]/route.ts` (POST de um clique, RFC 8058).
- Test: `tests/integration/marketing.test.ts`, `tests/unit/marketing-templates.test.ts`.

Migração 10, parte marketing:

```sql
ALTER TABLE users ADD COLUMN marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN marketing_opt_in_at BIGINT;
ALTER TABLE users ADD COLUMN unsubscribe_token TEXT UNIQUE;
CREATE TABLE email_campaigns (
  id SERIAL PRIMARY KEY, template TEXT NOT NULL, audience TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  created_by INTEGER, created_at BIGINT NOT NULL
);
CREATE TABLE email_campaign_recipients (
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at BIGINT NOT NULL,
  PRIMARY KEY (campaign_id, user_id)
);
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
```

**Interfaces:**
- `MARKETING_TEMPLATES = ["weMissYou", "announcement"] as const`; `type MarketingTemplate`.
- `AUDIENCES = ["churned", "active", "neverSubscribed", "all"] as const` (`churned` = `status='canceled'`; `active` = libera acesso; `neverSubscribed` = sem linha ou `status='none'|'incomplete'|'incomplete_expired'`; `all` = todos). Toda audiência aplica `marketing_opt_in = TRUE AND is_platform_admin = FALSE`.
- `renderMarketingEmail({ template, locale, name, subject?, body?, unsubscribeUrl, appUrl }) → { subject, html }`, reaproveitando o visual de `src/server/email-templates.ts` (exportar de lá o que for preciso, sem duplicar o HTML base). `weMissYou`: assunto "Sentimos sua falta no NewFarmer 🌱" / "We miss you at NewFarmer 🌱"; texto curto e caloroso lembrando o diário e o calendário de plantio, que os dados continuam guardados, e botão "Voltar a assinar" para `${appUrl}/subscribe`. `announcement`: assunto e texto escritos no Admin (texto puro, escapado; quebras de linha viram `<br>`), botão "Abrir o NewFarmer" para `${appUrl}/dashboard`. Rodapé de todo e-mail de marketing: "Você recebe este e-mail porque aceitou novidades do NewFarmer. Descadastrar" (link).
- `listAudience(db, audience) → { id, name, email, locale }[]`; `unsubscribeUrl(db, userId, appUrl)` (cria `unsubscribe_token` aleatório de 32 bytes base64url se não houver); `unsubscribeByToken(db, token) → boolean`.
- `sendCampaign(db, mailer, { campaignId, appUrl, max = 50 }) → { sent: number; remaining: number }`: envia para quem da audiência ainda não está em `email_campaign_recipients` daquela campanha, até `max` por chamada (limite do Resend e do tempo da Vercel), grava cada envio **depois** de enviar com sucesso, cabeçalhos `List-Unsubscribe: <${url}>` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Página `/unsubscribe/[token]`: mostra "Você não vai mais receber e-mails de novidades." com botão de confirmar (POST); token inválido mostra mensagem neutra. `noindex`.

- [ ] **Step 1:** testes (falham primeiro):
  - audiência só traz quem tem opt-in; nunca o dono; `churned` só canceladas;
  - descadastro pelo token desliga o opt-in; token inválido não muda nada;
  - `sendCampaign` com `max=2` e 3 destinatários envia 2, depois 1, depois 0 (sem repetir); falha do mailer no 2º não grava o 2º;
  - HTML do `weMissYou` em pt e en contém o link de descadastro e escapa o nome `<b>Ana</b>`; `announcement` escapa o texto do Admin;
  - cadastro com a caixa desmarcada grava `false`; marcada grava `true` com data.
- [ ] **Step 2:** implementar; e2e no `profile.spec.ts`: liga e desliga "Receber novidades por e-mail" no Perfil.
- [ ] **Step 3:** commit `feat: consentimento de e-mail marketing, descadastro e templates`.

## Task 6: Admin: visão geral, assinantes e detalhe

**Files:**
- Move: `src/app/(app)/settings/*` → `src/app/(app)/admin/*` (feito na Task 1); `SettingsTabs` → `AdminTabs`.
- Create: `src/server/admin.ts`, `src/app/(app)/admin/page.tsx` (visão geral), `src/app/(app)/admin/subscribers/page.tsx`, `src/app/(app)/admin/subscribers/[id]/page.tsx`.
- Modify: `src/app/(app)/admin/layout.tsx` (abas: Visão geral, Assinantes, Leads, E-mails, Activity logs, Monitoramento), `src/components/UserMenu.tsx` (item "Admin" no lugar de "Settings").
- Test: `tests/integration/admin.test.ts`, `tests/e2e/admin.spec.ts` (substitui o `monitoring.spec.ts` de settings; mantém os casos dele com as rotas novas).

**Interfaces:**
- `getAdminOverview(db, now) → { users, newUsers7d, subscriptions: Record<"active"|"past_due"|"canceled"|"none", number>, mrr: Record<Currency, number> /* centavos, só ativas */, newSubscriptions30d, cancellations30d, visitors7d, pageViews7d, pageViewsByDay: { day: string; views: number }[] /* últimos 14 dias */ }`.
- `listSubscribers(db, { q?, status?, before?, limit = 50 })` → `{ id, name, username, email, city, country, status, currency, currentPeriodEnd, createdAt, lastSeenAt, animals: number, crops: number }[]` (busca por nome, e-mail ou username com `ILIKE`, parâmetros sempre em `$n`).
- `getSubscriberDetail(db, userId)` → dados da conta, assinatura, `animals: { id, count }[]`, `crops: string[]`, `pageViews` (últimas 200, via `listUserPageViews`), `marketingOptIn`. **Sem** diário.

Telas:
- Visão geral: cartões (assinantes ativos, MRR por moeda formatado com `formatPrice`-equivalente para valores, novas e canceladas em 30 dias, visitantes e páginas vistas em 7 dias) e um gráfico de barras simples em CSS (14 dias de páginas vistas, com rótulo de valor acessível; sem biblioteca).
- Assinantes: tabela com busca e filtro de status, "Carregar mais"; no celular vira lista de cartões (sem rolagem horizontal da página; a tabela pode rolar dentro de um contêiner `overflow-x-auto`).
- Detalhe: blocos "Conta", "Assinatura", "Criação" (animais com ícone e quantidade, plantações), "Páginas visitadas" (data, caminho), "E-mail marketing: aceita / não aceita". Abrir o detalhe grava `admin.viewedUser` com `target` = username.

- [ ] **Step 1:** testes de integração com 3 contas e assinaturas variadas: números da visão geral, MRR por moeda só das ativas, busca por e-mail parcial, filtro por status, detalhe sem nenhum campo do diário (`JSON.stringify` não contém o texto da anotação criada no teste).
- [ ] **Step 2:** e2e: pessoa comum recebe 404 em `/admin`, `/admin/subscribers`, `/admin/subscribers/1`; dono (via `/api/dev/make-admin`) vê as abas, encontra um assinante pela busca e abre o detalhe com a cidade e os animais.
- [ ] **Step 3:** commit `feat: Admin com visão geral, assinantes e detalhe do assinante`.

## Task 7: Admin: leads e campanhas de e-mail

**Files:**
- Create: `src/app/(app)/admin/leads/page.tsx`, `src/app/(app)/admin/emails/page.tsx`, `src/app/(app)/admin/emails/CampaignForm.tsx`, `src/app/actions/admin.ts`.
- Modify: `src/server/page-views.ts` (`listLeads`), `src/server/marketing.ts` (`createCampaign`, `listCampaigns`, `audienceCount`).
- Test: `tests/integration/leads.test.ts`, `tests/e2e/admin.spec.ts` (casos novos).

**Interfaces:**
- `listLeads(db, { since, before?, limit = 50 }) → { visitorId, firstSeen, lastSeen, pages: number, lastPath: string, furthestStep: FunnelStep, user: { id, username, email } | null, subscribed: boolean }[]` — `furthestStep` é o passo mais avançado do `FUNNEL_STEPS` que o visitante alcançou (`paid` se a conta ligada tem acesso).
- `createCampaign(db, { template, audience, subject, body, createdBy }) → number`; `listCampaigns(db) → { id, template, audience, subject, createdAt, sent: number }[]`; `audienceCount(db, audience) → number`.
- Ações (todas com `requirePlatformAdmin()` e `limitWrites`): `previewCampaignAction` (devolve o HTML renderizado para um destinatário de exemplo com o nome do próprio dono), `sendCampaignAction` (cria a campanha na primeira vez e chama `sendCampaign` com `max=50`; devolve `{ sent, remaining }`; botão "Continuar envio" enquanto `remaining > 0`; loga `marketing.campaignSent` com `{ template, audience, sent }`).

Telas:
- Leads: funil (barras com o número de visitantes em cada passo: Landing → Cadastro → Sua criação → Assinatura → Pagou, e a % de quem passou de um para o outro) e tabela de visitantes recentes (primeira e última visita, páginas, última página, até onde chegou, conta ligada com link para o detalhe do assinante). Filtro de período: 7, 30 e 90 dias.
- E-mails: escolher template (`weMissYou` "Sentimos sua falta", `announcement` "Novidade / campanha"), escolher público (com a contagem de quantas pessoas vão receber, só quem aceitou e-mails), assunto e texto (só para `announcement`), "Ver prévia" (mostra o e-mail num `<iframe sandbox="" srcdoc=...>`), "Enviar" com confirmação ("Enviar para N pessoas?"). Abaixo, histórico das campanhas com quantos receberam.

- [ ] **Step 1:** testes de integração do `listLeads` (3 visitantes, um ligado a conta paga: `furthestStep` certo, `lastPath` certo, ordenação pela última visita) e de `audienceCount`.
- [ ] **Step 2:** e2e: dono envia "Sentimos sua falta" para o público "churned" com 1 conta cancelada que aceitou e-mails (preparada pelo `/api/dev/...` de E2E ou pelo webhook fake), confere a mensagem em `/dev/inbox` com o link de descadastro; abrir o link e confirmar desliga o opt-in; reenviar a mesma campanha não manda de novo.
- [ ] **Step 3:** commit `feat: Admin com funil de leads e campanhas de e-mail`.

## Task 8: Landing page com imagens do sistema

**Files:**
- Create: `playwright.screenshots.config.ts`, `tests/screenshots/capture.spec.ts`, `public/screenshots/{en,pt}-{dashboard,animal,weather}-{desktop,mobile}.png` (geradas), `src/components/BrowserFrame.tsx`, `src/components/PhoneFrame.tsx`, `src/app/opengraph-image.png` (cópia do print do Painel em 1200×630 gerada pelo mesmo script).
- Modify: `src/app/(marketing)/page.tsx`, `src/app/(marketing)/layout.tsx` (topo com "Entrar" e "Assinar", rodapé com Privacidade, Termos, Preferências de cookies e idioma), `messages/*.json` (`home.*`), `package.json` (script `"screenshots": "playwright test -c playwright.screenshots.config.ts"`), `next.config.ts` (`devIndicators: false`, para o selo do modo de desenvolvimento não sair nos prints).

Script de prints: sobe o mesmo servidor de dev dos e2e (`WEATHER_FAKE=1`, `STRIPE_FAKE=1`, banco PGlite próprio `data/screenshots-pglite`), cria uma conta de demonstração "Maria" em Fundão (Portugal) com galinhas 24, cabras 6, vacas 3, plantações tomate, alface, batata, milho, 3 anotações no diário das galinhas, assina pelo fake, e tira os prints em PT e EN, tema claro, com o aviso de cookies fechado: Painel, ficha das galinhas na aba Diário e Clima, em 1440×900 (desktop) e 390×844 com `deviceScaleFactor: 2` (celular). Sem dado real de ninguém.

Landing (de cima para baixo, tudo traduzido):
1. Hero: título "Sua criação e sua horta organizadas, do jeito do seu clima" / "Your animals and garden, organized for your climate", subtítulo de uma frase, botão "Assinar por <preço>/mês" (→ `/register`) e "Entrar"; ao lado (empilha no celular) o print do Painel dentro do `BrowserFrame` com o print do celular no `PhoneFrame` sobreposto no canto.
2. "O que o NewFarmer faz": 6 itens com ícone — guias de cuidado por animal, calendário de plantio no seu clima e hemisfério, previsão de 5 dias com chuva em mm, diário por animal, funciona sem internet e envia depois, regras do seu país (ex.: declaração de animais).
3. "Veja por dentro": alternância Computador | Celular (botões com `aria-pressed`) mostrando os 3 prints de cada formato com legenda.
4. "Como funciona": 3 passos (Crie a conta → Conte o que você cria → Receba o que fazer em cada mês).
5. Preço: cartão único com o preço da moeda do visitante (`x-vercel-ip-country`), lista do que inclui, "Cancele quando quiser" e o botão.
6. Perguntas frequentes (5): precisa de cartão? (sim, assinatura mensal), posso cancelar? (sim, no Perfil, acesso até o fim do mês pago), funciona sem internet?, meus dados são meus? (baixar e apagar no Perfil), para quem é? (pequenos criadores e hortas de família).
7. Chamada final + rodapé.

SEO da landing: `<h1>` único, `next/image` com `alt` descritivo, `sizes` corretos e `priority` só no print do hero; JSON-LD `SoftwareApplication` (`name`, `applicationCategory: "LifestyleApplication"`, `operatingSystem: "Web, iOS, Android"`, `offers` com os 3 preços e moedas) e `FAQPage` com as 5 perguntas, num `<script type="application/ld+json">` (o CSP já permite inline). Título da página ≤ 60 caracteres e descrição ≤ 155.

- [ ] **Step 1:** script de prints; rodar `npm run screenshots` e conferir as 12 imagens (abrir 2 com o Read para ver se não há aviso de cookies, selo de dev ou texto cortado).
- [ ] **Step 2:** landing; e2e em `pages.spec.ts`: o hero mostra o botão com "R$ 6,99" quando a requisição traz `x-vercel-ip-country: BR` (`page.setExtraHTTPHeaders`), "€1.99" com `PT`, "$2.00" sem cabeçalho; a alternância Computador/Celular troca as imagens; JSON-LD é JSON válido com 3 `offers`; nada passa da largura em 320 px (reaproveite a checagem de `mobile.spec.ts`).
- [ ] **Step 3:** commit `feat: landing page nova com imagens do sistema no computador e no celular`.

## Task 9: Política de Privacidade, Termos e documentação de vendas

**Files:**
- Modify: `content/legal/privacy.{pt,en}.md`, `content/legal/terms.{pt,en}.md` (data "4 de novembro de 2026" / "November 4, 2026"), `docs/deploy.md`.

Termos (novas seções):
- Assinatura: preço mensal único (R$ 6,99 no Brasil, € 1,99 na Europa, US$ 2,00 no resto do mundo; impostos incluídos quando a lei exigir), cobrança recorrente mensal automática no cartão pelo Stripe, sem teste grátis; o acesso ao app depende da assinatura ativa.
- Cancelamento: a qualquer momento no Perfil (Gerenciar ou cancelar); o acesso continua até o fim do período pago; não há multa.
- Arrependimento e reembolso: reembolso integral se pedir em até 7 dias da primeira cobrança (Brasil, CDC art. 49) ou 14 dias (UE, direito de retratação); nos EUA e demais países, 7 dias. Pedido pelo e-mail de contato. Fora desse prazo, sem reembolso de mês parcial, salvo exigência da lei local.
- Mudança de preço: aviso por e-mail com 30 dias de antecedência; quem não concordar pode cancelar.
- Falha de pagamento: o Stripe tenta de novo; sem pagamento, o acesso é suspenso e os dados continuam guardados até a pessoa apagar a conta.

Política (novas seções ou mudanças):
- Pagamentos: o Stripe processa o pagamento como controlador independente/operador; o NewFarmer não vê nem guarda o número do cartão; guardamos o identificador de cliente e de assinatura, status, moeda, valor e datas. Base legal: execução do contrato (LGPD art. 7º, V; RGPD art. 6(1)(b)). O Stripe guarda dados de cobrança pelo prazo que a lei fiscal exige, mesmo depois de a conta ser apagada.
- Cookies: lista atualizada (`nf_session`, `nf_locale`, `nf_theme`, `nf_consent` essenciais; `nf_vid` só com "Aceitar todos", 1 ano, para medir as páginas visitadas); como mudar a escolha.
- Medição de páginas: o que é gravado (identificador aleatório do visitante, conta se logado, página sem parâmetros, site de origem, data; sem IP), base legal consentimento (LGPD art. 7º, I; RGPD art. 6(1)(a); ePrivacy), prazo 180 dias.
- E-mail marketing: só com o aceite, base consentimento; descadastro em um clique em todo e-mail ou no Perfil; o histórico de envios fica enquanto a conta existir.
- Acesso do dono do site: o administrador vê nome, e-mail, username, cidade, país, criação, assinatura e páginas visitadas para suporte, cobrança e marketing; não vê o diário; cada acesso ao detalhe fica registrado.
- Lista de operadores: Vercel, Supabase, Resend, Open-Meteo, **Stripe**.
- Apagar a conta cancela a assinatura e apaga visitas e histórico de e-mails junto.

`docs/deploy.md`: seção "Quando comprar o domínio" (passo a passo, sem mudar código): 1) Vercel → Domains → adicionar o domínio e apontar o DNS como ela pedir; 2) Resend → Domains → adicionar `seudominio.com` (ou `mail.seudominio.com`), criar no DNS os registros que ele mostrar (SPF/MX de retorno e DKIM) e esperar "Verified"; 3) criar também o registro DMARC `_dmarc` com `v=DMARC1; p=none; rua=mailto:<seu e-mail>`; 4) trocar na Vercel `APP_URL=https://seudominio.com`, `MAIL_FROM=NewFarmer <nao-responda@seudominio.com>`, `MAIL_REPLY_TO=<seu e-mail de contato>` e, se quiser, `MAIL_MARKETING_FROM=NewFarmer <novidades@seudominio.com>`; 5) no Stripe, trocar a URL do webhook para `https://seudominio.com/api/stripe/webhook` (o segredo `whsec_` muda: atualizar `STRIPE_WEBHOOK_SECRET`); 6) Redeploy e testar: cadastro recebe o e-mail de confirmação, "esqueci a senha" chega, um e-mail de campanha de teste chega com o link de descadastro. Explicar que todos os links dos e-mails, do sitemap, do canonical e do Stripe saem do `APP_URL`, por isso basta trocá-lo. Depois, checklist "Antes de vender" — conta Stripe verificada (CPF/CNPJ), 3 preços, webhook, Customer Portal, 5 variáveis em Production, plano Pro da Vercel (o Hobby não permite uso comercial), plano comercial do Open-Meteo, domínio próprio verificado no Resend, IVA/OSS para clientes da UE e tributação no Brasil com contador, revisar Termos e Política com um advogado.

- [ ] **Step 1:** atualizar os textos; e2e `content.spec.ts`/`pages.spec.ts`: `/terms` contém "R$ 6,99", "7 dias" e "14 dias"; `/privacy` contém "Stripe" e "nf_vid"; em inglês, `/terms` contém "€1.99" e "$2.00".
- [ ] **Step 2:** commit `docs: termos e privacidade para assinatura, cookies de medição e e-mail marketing`.

## Verificação final (depois da Task 9)

- `npx tsc --noEmit`, `npx vitest run`, `npx playwright test`, `npm run build` passando.
- Varredura de vazamento (`tests/e2e/security-headers.spec.ts` "nada de dado interno") estendida a `/subscribe`, `/profile` e `/admin` (este só com o dono; ali e-mails são esperados, mas `password_hash`, `token_hash`, `unsubscribe_token`, `stripe_events` não).
- Teste de injeção SQL (`tests/integration/sql-injection.test.ts`) cobre `listSubscribers` (busca) e `listLeads`.
- Revisão final do branch inteiro.
