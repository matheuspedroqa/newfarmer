# NewFarmer — Design do MVP

Data: 2026-10-29
Status: aprovado pelo usuário (seções 1, 2 e 3)

## 1. Objetivo

Aplicação web (somente computador) que ajuda pessoas que estão se mudando para o interior a cuidar de animais e plantações, com conteúdo adaptado ao tipo de clima e hemisfério da cidade informada no cadastro, previsão do tempo real de 5 dias e um painel com o que fazer no mês.

Usuário do MVP: o próprio dono do projeto, rodando no computador local. A arquitetura deve permitir publicar na internet depois sem reescrever.

## 2. Escopo

### Dentro do MVP
- Login estilizado (tema rural), cadastro em 2 etapas, logout.
- Recuperação de senha por e-mail, usando uma caixa de e-mail de teste local (`/dev/inbox`).
- Perfil "Minha fazenda" no cadastro (etapa 2, pulável) e editável no menu **MyFarm**: animais possuídos com quantidade, plantações cultivadas, troca de cidade.
- Painel (Dashboard), Animais (6), Plantações (100 culturas em 4 grupos — ficha simples), Clima (5 dias, API real).
- Idiomas: inglês (padrão) e português, toggle no canto superior direito e escolha no Perfil.
- Modo claro e noturno, toggle no canto superior direito.
- Conteúdo pesquisado na internet, em PT e EN, com fontes citadas em cada ficha.

### Fora do MVP
- Versão mobile/responsiva otimizada (a tela deve funcionar a partir de 1024 px de largura).
- Envio real de e-mails (o código fica pronto para trocar o "carteiro" de teste por um serviço real).
- Outros idiomas, login com Google, múltiplas fazendas por conta, publicação na internet.

## 3. Tecnologia

| Item | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS v4, tema claro/escuro pela classe `dark` no `<html>`, lida de cookie (sem piscar) |
| Idiomas | `next-intl` sem rotas por idioma (idioma em cookie), mensagens em `messages/pt.json` e `messages/en.json` |
| Banco | SQLite em arquivo local (`data/newfarmer.db`) via `better-sqlite3`, SQL direto com comandos preparados |
| Senhas | Hash com `bcryptjs` (custo 12); nunca guardar senha em texto |
| Sessão | Sessão própria: token aleatório em cookie `httpOnly`, `sameSite=lax`, expira em 30 dias; no banco guarda-se só o hash do token |
| Validação | `zod` (mesmos esquemas no navegador e no servidor) |
| Clima | Open-Meteo (gratuito, sem chave): Geocoding API, Forecast API, Historical/Archive API |
| Testes | Vitest (unidade e integração), Playwright (ponta a ponta) |

## 4. Telas

Todas as telas têm no canto superior direito: toggle de idioma **PT / EN** e toggle **claro / noturno**.

1. **Entrada (`/login`)**: imagem rural de fundo, logo, e-mail, senha, botão Entrar, links "Criar conta" e "Esqueci minha senha".
2. **Cadastro (`/cadastro`)**
   - Etapa 1: nome, e-mail, senha (mín. 8 caracteres), confirmação de senha, cidade com autocompletar (Open-Meteo Geocoding, mostra "Cidade, Estado, País").
   - Etapa 2 (pulável): um card por animal (Galinhas, Porcos, Vacas, Ovelhas, Cabras, Patos); ao marcar, aparece campo de quantidade. Lista de plantações agrupada para marcar.
3. **Esqueci minha senha (`/recuperar`)** e **Nova senha (`/recuperar/[token]`)**.
4. **Caixa de e-mail de teste (`/dev/inbox`)**: lista os e-mails "enviados". Disponível apenas quando `NODE_ENV !== "production"`.
5. **Área logada** (menu lateral; cabeçalho com nome, cidade e tipo de clima):
   - **Painel** (tela inicial): clima de hoje; meus animais com quantidades; minhas plantações com "o que fazer este mês"; dica da estação atual para meus animais. Estados vazios com convite para preencher o MyFarm.
   - **MyFarm**: editar animais/quantidades, plantações e cidade. Ao trocar a cidade, recalcula tipo de clima e hemisfério.
   - **Animais**: sub-abas por animal. Seções: raças, temperatura ideal, cuidados por estação (do clima do usuário), alimentação, saúde, sinais de doença, remédios caseiros, remédios veterinários. Aviso fixo nos remédios: "Consulte um veterinário antes de medicar". Rodapé com fontes.
   - **Plantações**: sub-abas por grupo; cada plantação com calendário de 12 meses (plantio direto, sementeira, transplante, colheita) para o clima e hemisfério do usuário, e cuidados (adubação, poda se houver, irrigação, outros). Rodapé com fontes.
   - **Clima**: previsão real de 5 dias (máx., mín., chance de chuva, ícone) e horário da última atualização.

### Visual (escolhido no protótipo, variante D — branch `prototype/visual`)

- **Telas públicas** (login, cadastro, recuperar): tela dividida — à esquerda, ilustração de paisagem rural com uma frase de boas-vindas; à direita, logo, botões PT/EN e tema, e o formulário.
- **Área logada**: trilho estreito de ícones à esquerda (80 px, verde), cabeçalho com saudação, cidade e tipo de clima; Painel em blocos de tamanhos diferentes, com o clima grande em destaque (agora + 5 dias), um bloco por animal com a quantidade, bloco "adicionar animal", faixa "este mês nas suas plantações" e bloco da dica da estação.
- **Fontes**: Fraunces (títulos e números grandes) e Nunito (texto).
- **Cores**:

| Uso | Claro | Noturno |
|---|---|---|
| Fundo | `#f6f1e7` | `#15180f` |
| Superfície | `#ffffff` | `#20241a` |
| Texto | `#2e2a22` | `#ece6d6` |
| Texto suave | `#6e675a` | `#a8a190` |
| Principal (verde) | `#3f6b3a` | `#9fd08f` |
| Texto sobre principal | `#ffffff` | `#15180f` |
| Destaque (caramelo) | `#c8873a` | `#e0a35c` |
| Suave (creme) | `#fbeedd` | `#2b2316` |
| Borda | `#ddd3bf` | `#3a3f2e` |
| Trilho de ícones | `#3f6b3a` | `#1f2a1b` |
| Erro | `#b42318` | `#f97066` |

## 5. Conteúdo

### Animais
Galinhas, Porcos, Vacas, Ovelhas, Cabras, Patos.

### Plantações (lista original de 20 — ampliada para 100, ver seção 12)
- Hortaliças: alface, tomate, couve, cenoura, cebola
- Grãos: milho, feijão, arroz, trigo, soja
- Frutas: banana, laranja, maracujá, morango, mamão
- Raízes e ervas: mandioca, batata, batata-doce, salsinha, manjericão

### Formato
Um arquivo JSON por item em `content/animals/<id>.json` e `content/crops/<id>.json`, com textos em `pt` e `en`, variações por tipo de clima onde fizer sentido (cuidados por estação, calendário) e lista `sources` (título + URL). Esquema validado por `zod` em teste: todo arquivo precisa ter PT e EN completos e calendário para os 5 tipos de clima.

Calendários são escritos na referência do **hemisfério sul**; para o hemisfério norte o sistema desloca os meses em 6 (mês `m` → `((m + 5) mod 12) + 1`). Estações seguem a mesma regra.

Pesquisa: fontes preferenciais Embrapa, FAO, universidades e órgãos veterinários oficiais. Conteúdo entregue por partes para revisão do usuário.

## 6. Tipo de clima (5 zonas)

No cadastro e na troca de cidade, busca-se na Archive API do Open-Meteo a média mensal de temperatura e a precipitação dos últimos 10 anos completos para as coordenadas. Com `Tfria` = média do mês mais frio, `Tano` = média anual e `Pano` = chuva anual (mm), aplicar em ordem:

1. **Semiárido**: `Pano < 20 × Tano + 140`
2. **Tropical**: `Tfria ≥ 18 °C`
3. **Frio**: `Tfria ≤ −3 °C`
4. **Subtropical**: `8 °C ≤ Tfria < 18 °C`
5. **Temperado**: `−3 °C < Tfria < 8 °C`

Hemisfério: latitude < 0 → sul; caso contrário → norte. Se a Archive API falhar no cadastro, o cadastro continua com a zona estimada pela latitude (|lat| < 23,5 → tropical; < 35 → subtropical; < 55 → temperado; senão frio), marcada como "estimada", e o sistema recalcula no próximo login.

## 7. Dados (SQLite)

- `users`: id, name, email (único, minúsculas), password_hash, city_label, latitude, longitude, country_code, climate_zone, climate_estimated, hemisphere, locale, theme, created_at
- `sessions`: id, user_id, token_hash, expires_at
- `password_reset_tokens`: id, user_id, token_hash, expires_at (1 h), used_at
- `login_attempts`: email, attempted_at, success
- `farm_animals`: user_id, animal_id, count (inteiro 1–100000) — PK (user_id, animal_id)
- `farm_crops`: user_id, crop_id — PK (user_id, crop_id)
- `weather_cache`: key (lat,lon arredondados a 2 casas), payload JSON, fetched_at
- `dev_emails`: id, to, subject, body_html, created_at

## 8. Clima (previsão)

- Forecast API do Open-Meteo com `daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code`, `forecast_days=5`, `timezone=auto`.
- Cache de 1 hora em `weather_cache`. Se a API falhar, servir o cache mais recente com aviso "atualizada às HH:MM". Sem cache: mensagem "Previsão indisponível agora", e o resto da página funciona.
- O cliente HTTP do Open-Meteo fica atrás de uma interface própria (`WeatherProvider`) para ser substituído por um falso nos testes.

## 9. "O que fazer este mês"

Função pura `monthlyTasks(userCrops, climateZone, hemisphere, month)` → lista de `{ cropId, activities: ('plantio' | 'sementeira' | 'transplante' | 'colheita')[] }`, omitindo plantações sem atividade no mês. A dica de estação dos animais usa `seasonFor(month, hemisphere)`.

## 10. Erros e validações

| Situação | Comportamento |
|---|---|
| Campo vazio, e-mail inválido, senha < 8 | Mensagem sob o campo, antes do envio (e revalidado no servidor) |
| E-mail já cadastrado | "Este e-mail já tem uma conta. Quer entrar?" |
| Login inválido | "E-mail ou senha incorretos" (sem dizer qual) |
| 5 falhas de login em 15 min para o mesmo e-mail | Bloqueio de 15 min com mensagem |
| Cidade não encontrada | "Não encontramos essa cidade. Tente com o nome do estado ou país" |
| API de clima fora | Cache com horário, ou "Previsão indisponível agora" |
| Quantidade de animais não inteira, ≤ 0 ou > 100000 | Recusa com explicação |
| Clique duplo em salvar/criar | Botão desabilitado durante o envio; servidor idempotente (e-mail único, PKs compostas) |
| Acesso à área logada sem sessão | Redireciona para `/login` |
| Link de recuperação vencido ou usado | "Este link expirou. Peça um novo" |
| "Esqueci minha senha" com e-mail inexistente | Mesma mensagem de sucesso (não revela se a conta existe) |

Todas as mensagens existem em PT e EN.

## 11. Testes

- **Unidade (Vitest)**: classificação de clima, inversão de hemisfério, estação do mês, `monthlyTasks`, validações `zod`, esquema dos arquivos de conteúdo.
- **Integração (Vitest + SQLite em memória)**: cadastro, login, bloqueio por tentativas, sessão, recuperação de senha, MyFarm (salvar/editar, troca de cidade recalcula zona), cache e falha da previsão. Open-Meteo substituído por `WeatherProvider` falso.
- **Ponta a ponta (Playwright)**: cadastro completo → painel → MyFarm → trocar idioma → modo noturno → trocar cidade → recuperar senha pela `/dev/inbox`.
- **Teste real do clima** (comando separado `npm run test:live`): chama a Open-Meteo de verdade para uma cidade conhecida e confere o formato da resposta. Não roda junto com os demais.

Uma tarefa só está pronta quando os testes dela passam (TDD: teste antes, código depois).

## 12. Mudanças pedidas pelo usuário depois da aprovação (2026-10-29 a 2026-11-02)

Estas decisões valem sobre o texto acima quando houver conflito.

- **Menu da conta** no cabeçalho, à esquerda do "Sair": **MyFarm** (animais, quantidades, plantações e cidade do clima) e **Perfil** (informações pessoais, troca de senha com a senha atual, escolha do idioma). MyFarm saiu do trilho de ícones.
- **Idioma padrão: inglês** (sem cookie nem preferência salva). Contas novas herdam o idioma da tela de cadastro.
- **Animais:** "melhor manual" de cada um feito a partir de uma base de conhecimento de 9 países (BR, US, CA, DE, ES, FR, PT, IT, MX) em `knowledge/`, com bloco **"No seu país"** mostrado conforme o país da cidade do cadastro.
- **Plantações:** as **100 culturas** mais conhecidas (30 hortaliças, 15 grãos e leguminosas, 30 frutas e árvores frutíferas, 25 raízes, ervas e temperos) com ficha **simples**: épocas de plantio por tipo de clima e hemisfério, adubação e cuidados básicos (`content/crops/GUIDE.md`). Sem bloco por país.
- "Conforme a localidade" = tipo de clima e hemisfério da cidade do cadastro (não há calendário país a país).
