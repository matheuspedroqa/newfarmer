# NewFarmer Etapa 6 — Ajustes de uso, previsão com chuva, registro diário do tempo, favicon e celular Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pedidos do usuário de 2026-11-03:
- animação ao passar o mouse nos botões do topo;
- só as abas dos animais configurados;
- "Adicionar plantação" na aba Plantações;
- milímetros de chuva na previsão;
- registro diário às 00h00 UTC da previsão de amanhã para o Fundão, que também mantém o Supabase ativo;
- favicon em todas as páginas;
- primeira versão responsiva para celulares.

**Architecture:** Mudanças pequenas nos componentes existentes. O registro diário usa **Vercel Cron**, que chama uma rota protegida por `CRON_SECRET`, configurada só no painel da Vercel. O favicon usa a convenção de arquivos do Next (`src/app/icon.svg` e `apple-icon`). Para o celular, a abordagem é *mobile-first* com classes responsivas do Tailwind (`sm:`, `md:`, `lg:`): o trilho lateral vira barra inferior em telas pequenas.

**Tech Stack:** a mesma (Next.js 15 App Router, TypeScript, Tailwind v4, next-intl, Postgres via pg/PGlite, Vitest, Playwright). Sem dependências novas.

## Global Constraints

- Textos sempre em PT e EN (`messages/*.json`, 2 espaços, UTF-8, LF), mantendo as mesmas chaves nos dois.
- `import "server-only"` em `src/server/*`. Só SQL parametrizado: um teste varre `src/` atrás de `${}` dentro de consultas.
- Nenhum segredo em arquivo do repositório. `CRON_SECRET` vive só nas variáveis de ambiente da Vercel.
- Animação ao passar o mouse:
  - transição curta (`transition` 150–200 ms);
  - visível nos dois temas;
  - também no foco do teclado (`focus-visible`);
  - respeitar `prefers-reduced-motion` com `motion-reduce:transition-none`.
- Celular:
  - nada pode estourar a largura nem criar rolagem horizontal;
  - toques com área mínima de 44×44 px;
  - testes do robô em pelo menos 3 tamanhos: iPhone SE (375×667), Pixel 7 (412×915) e Galaxy S9+ (320×658);
  - o computador continua igual.
- Fundão: `Fundão, Castelo Branco, Portugal`, latitude **40.1378**, longitude **-7.5014**.

---

### Task 1: Animação nos botões do topo e favicon

**Files:**
- Modify:
  - `src/components/UserMenu.tsx`: botão com o nome; itens do menu;
  - `src/app/(app)/layout.tsx`: botão Sair;
  - `src/components/ThemeToggle.tsx`;
  - `src/components/LocaleToggle.tsx`.
- Create: `src/app/icon.svg` (🌾 sobre fundo verde `#3f6b3a`, cantos arredondados, legível em 16 px) e `src/app/apple-icon.png` (180×180, gerado a partir do SVG).
- Delete: `src/app/favicon.ico` (o ícone padrão do Next).
- Test: `tests/e2e/pages.spec.ts`.

- [ ] **Step 1: Testes que falham.**
  - **E2E de ícone:** as páginas `/`, `/login`, `/painel` (logado) e `/nao-existe` têm `<link rel="icon">` apontando para um arquivo que responde 200 com tipo `image/svg+xml`.
  - **E2E de animação:** ao passar o mouse, a cor de fundo calculada (`getComputedStyle`) muda no botão Sair, no botão do nome, no EN/PT não selecionado e no botão de tema.
- [ ] **Step 2:** veja os testes falharem.
- [ ] **Step 3:** implemente.
  - Cada botão do topo ganha `transition-colors duration-150 hover:bg-soft focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none`.
  - O botão de idioma já selecionado ganha `hover:opacity-90`.
  - Os itens do menu da conta já têm `hover:bg-soft`; acrescente a transição.
- [ ] **Step 4:** suíte inteira, montagem do site e robô. Commit `feat: animação nos botões do topo e favicon do NewFarmer`.

### Task 2: Só os animais configurados e "Adicionar plantação"

**Files:**
- Modify:
  - `src/app/(app)/animais/page.tsx`: vai para o primeiro animal da fazenda; sem animais, mostra o estado vazio;
  - `src/app/(app)/animais/[id]/page.tsx`: as abas mostram só os animais de `getFarm(db, user.id).animals`; um animal fora da fazenda redireciona para `/animais`;
  - `src/app/(app)/plantacoes/page.tsx`: cartão "＋ Adicionar plantação" (mesmo visual do "Adicionar animal" do Painel) que leva a `/myfarm#plantacoes`;
  - `src/components/FarmForm.tsx`: `id="plantacoes"` na seção de plantações e `id="animais"` na de animais;
  - `messages/*.json`: `animalPage.emptyTitle`, `animalPage.emptyText`, `animalPage.addAnimal`, `cropPage.addCrop`.
- Test: `tests/e2e/content.spec.ts`, `tests/e2e/farm.spec.ts`.

**Decisão:** quem abre o endereço de um animal que não tem (ex.: `/animais/goats`) volta para `/animais`. A ficha só aparece para animais da fazenda.

**Estado vazio:**
- título: "Você ainda não tem animais" / "You don't have any animals yet";
- texto: "Escolha seus animais no MyFarm para ver as fichas e o diário." / "Pick your animals in MyFarm to see their guides and diary.";
- botão: "＋ Adicionar animal" / "＋ Add animal", que leva a `/myfarm#animais`.

**Botão nas plantações:** "＋ Adicionar plantação" / "＋ Add crop". Aparece sempre: com plantações escolhidas, ao lado delas; sem nenhuma, como destaque.

- [ ] **Step 1: E2E que falham.**
  - Uma conta com só Galinhas e Vacas vê exatamente essas duas abas.
  - `/animais/goats` vai para a primeira aba.
  - Uma conta sem animais vê o estado vazio e o botão leva ao MyFarm.
  - Na aba Plantações, "Adicionar plantação" leva ao MyFarm na seção de plantações.
- [ ] **Step 2:** veja os testes falharem.
- [ ] **Step 3:** implemente.
- [ ] **Step 4:** verde. Commit `feat: abas só dos animais configurados e botão Adicionar plantação`.

### Task 3: Milímetros de chuva e registro diário do tempo do Fundão

**Files:**
- Modify:
  - `src/server/weather/types.ts`: `DayForecast` ganha `rainMm: number | null`;
  - `src/server/weather/open-meteo.ts`: pede também `precipitation_sum` na previsão;
  - `src/server/weather/fake.ts`: valores de teste, com pelo menos um dia de chuva (> 0) e um seco (0).
- Modify: os componentes da previsão (`src/components/WeatherHero.tsx` e a página `src/app/(app)/clima/page.tsx`) mostram "💧 3,2 mm" quando `rainMm > 0`, formatado no idioma da pessoa com 1 casa decimal. Em dia seco não mostram nada.
- Modify: `src/server/migrations.ts` (migração 8):

```sql
CREATE TABLE forecast_snapshots (
  id SERIAL PRIMARY KEY, place TEXT NOT NULL, latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL, forecast_date TEXT NOT NULL, payload JSONB NOT NULL,
  created_at BIGINT NOT NULL, UNIQUE (place, forecast_date)
);
ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
```

- Create:
  - `src/server/forecast-snapshot.ts`: `recordTomorrowForecast(db, provider, now)` busca a previsão do Fundão e grava o dia seguinte ao `now` em UTC (data `YYYY-MM-DD`, máxima, mínima, chance de chuva, mm de chuva, código do tempo). `ON CONFLICT (place, forecast_date) DO UPDATE` impede duplicata se a rota rodar duas vezes;
  - `src/app/api/cron/forecast/route.ts`: `GET` exige o cabeçalho `Authorization: Bearer ${CRON_SECRET}` (a Vercel Cron envia isso sozinha quando a variável existe). Sem a variável ou com valor errado, responde 401. Com sucesso, responde `{ ok: true, date }`;
  - `vercel.json`: `{ "crons": [{ "path": "/api/cron/forecast", "schedule": "0 0 * * *" }] }`.
- Modify:
  - `src/middleware.ts`: confirme que `/api/cron` não exige login;
  - `docs/deploy.md`: criar `CRON_SECRET` na Vercel (Production) com um valor aleatório longo, e onde ver as execuções (Vercel → Settings → Cron Jobs).
  - `content/legal/privacy.*.md` não muda: o registro diário não tem dado pessoal.
- Test: `tests/unit/weather-rain.test.ts` (formatação), `tests/integration/forecast-snapshot.test.ts`, `tests/integration/cron-route.test.ts`, `tests/e2e/farm.spec.ts`.

- [ ] **Step 1: Testes que falham.**
  - Com `now = 2026-11-03T00:00:05Z`, `recordTomorrowForecast` grava uma linha com `forecast_date = "2026-11-04"`, `place = "Fundão"`, latitude 40.1378 e longitude -7.5014. Rodar duas vezes deixa uma linha só.
  - A rota responde 401 sem cabeçalho, 401 com segredo errado, 401 quando `CRON_SECRET` não existe e 200 com o segredo certo, com o provedor falso.
  - No E2E da aba Clima, com o provedor falso, o dia chuvoso mostra "mm" e o seco não.
- [ ] **Step 2:** veja os testes falharem.
- [ ] **Step 3:** implemente. A rota usa `getWeatherProvider()` e `getDb()` (o banco aplica as migrações sozinho). Erro do provedor responde 502 e registra com `console.error`.
- [ ] **Step 4:** verde. Commit `feat: chuva em mm na previsão e registro diário do tempo do Fundão`.

### Task 4: Site responsivo (primeira versão para celular)

**Files:**
- Modify:
  - `src/app/(app)/layout.tsx` e `src/components/NavRail.tsx`: no celular (`< md`), o trilho lateral vira barra fixa embaixo, com os mesmos 4 ícones e rótulos acessíveis. O conteúdo ganha `pb-20`, para a barra não cobrir nada. O topo quebra em duas linhas quando falta espaço;
  - `src/app/(public)/layout.tsx`: `grid-cols-1 md:grid-cols-2`; a paisagem some ou vira faixa curta no celular; a margem `px-16` passa a `px-5 md:px-16`;
  - `src/app/(app)/painel/page.tsx`: os blocos (`grid-cols-4`, `col-span-*`) passam a `grid-cols-2 md:grid-cols-4`, e a previsão ocupa a largura toda no celular;
  - `src/app/(app)/animais/[id]/page.tsx`, `src/app/(app)/plantacoes/*`, `src/app/(app)/clima/page.tsx`, `src/components/MonthCalendar.tsx`, `src/components/FarmForm.tsx`, `src/components/DiaryForm.tsx`, `src/app/(app)/settings/*`: toda grade fixa (`grid-cols-3`/`4`) ganha a versão de uma coluna no celular. Abas e tabelas largas rolam dentro do próprio bloco (`overflow-x-auto`), sem rolar a página;
  - `src/components/CookieNotice.tsx`: o texto e o botão quebram linha sem cobrir a barra inferior.
- Create: `tests/e2e/mobile.spec.ts`.

- [ ] **Step 1: E2E que falham.** Para cada tamanho dos Global Constraints e para as páginas `/`, `/login`, `/cadastro`, `/painel`, `/animais/<um animal da conta>`, `/plantacoes`, `/clima`, `/myfarm`, `/perfil`, `/privacidade`:
  - não há rolagem horizontal: `document.documentElement.scrollWidth <= window.innerWidth`;
  - a navegação principal está visível;
  - o botão principal da página está visível e tem pelo menos 44 px de altura.

  Também: no celular, o cadastro e o login funcionam do começo ao fim.
- [ ] **Step 2:** veja os testes falharem.
- [ ] **Step 3:** implemente página por página até ficar verde. Tire fotos (`page.screenshot`) em 375 px do Painel, do Clima e do Cadastro e guarde-as em `test-results/mobile/`, que o Git ignora, para revisão visual.
- [ ] **Step 4:** a suíte inteira do robô continua verde no tamanho de computador. Commit `feat: site responsivo para celulares`.

---

## Verificação final

- [ ] `npx vitest run`, `npx playwright test` e `npm run build` verdes.
- [ ] Depois de publicar:
  - criar `CRON_SECRET` na Vercel;
  - conferir em Vercel → Cron Jobs que `/api/cron/forecast` está agendado;
  - rodar a rota uma vez à mão com o segredo e ver a linha em `forecast_snapshots`.
