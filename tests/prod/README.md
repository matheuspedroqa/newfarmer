# Testes em produção (funcionais, API e pentest)

Robôs do Playwright que testam o site publicado (https://newfarmer.app) de verdade.

## O que eles fazem e o que nunca fazem

- **Criam** contas de teste com e-mail `delivered+nf-...@resend.dev`. É a caixa de teste do Resend: aceita e descarta.
- **Pagam** com o cartão de teste 4242 da Stripe. Se o pagamento não for de teste (`cs_test_`), o teste para sem pagar.
- **Apagam** as contas de teste no fim, na etapa `cleanup`.
- **Nunca** apagam o banco nem a conta do admin. A função que apaga contas recusa o username do admin.
- **Nunca** enviam campanha do Admin → E-mails, porque iria para clientes de verdade. Só usam a prévia.
- **Mandam 1 e-mail** por rodada para contact@newfarmer.app: é o teste do formulário de Contato.
- **Pausam e retomam** a assinatura de uma conta de teste.

## Passo a passo (Windows, PowerShell, na pasta do projeto)

1. **Só na primeira vez,** instale o navegador do Playwright:

   ```powershell
   npx playwright install chromium
   ```

2. **Informe a conta de admin.** Escolha um dos dois jeitos.

   - **Jeito A: só para esta janela do PowerShell.** Não fica salvo em lugar nenhum.

     ```powershell
     $env:NF_ADMIN_USER = "seu_username_admin"
     $env:NF_ADMIN_PASS = "sua_senha_admin"
     ```

   - **Jeito B: num arquivo `.env.prodtest` na pasta do projeto.** Ele já está fora do git por causa da regra `.env*`, então nunca vai para o GitHub nem para a Vercel.

     ```
     NF_ADMIN_USER=seu_username_admin
     NF_ADMIN_PASS=sua_senha_admin
     ```

3. **Rode todos os testes.** São mais de 60, e levam uns 10 minutos.

   ```powershell
   npm run test:prod
   ```

4. **Veja o relatório,** com fotos e vídeos de cada falha:

   ```powershell
   npm run test:prod:report
   ```

### Rodar só uma parte

```powershell
npm run test:prod -- --project=functional   # telas e fluxos
npm run test:prod -- --project=api          # APIs
npm run test:prod -- --project=security     # pentest
npm run test:prod -- -g "Pausar"            # só os testes com "Pausar" no nome
```

A preparação (`setup`) e a limpeza (`cleanup`) rodam sozinhas em qualquer um desses comandos.

### Teste de força bruta (opcional)

Ele erra a senha até travar uma conta de teste e até bloquear a sua rede. **Depois dele, nenhum login da sua rede funciona por 15 minutos, nem o seu.**

```powershell
$env:PENTEST_RATELIMIT = "1"; npm run test:prod; Remove-Item Env:PENTEST_RATELIMIT
```

## Limites do site que afetam os testes

| Limite | Valor | O que fazer |
|---|---|---|
| Logins por rede | 10 a cada 15 min | Cada rodada usa uns 4. Espere 15 min entre rodadas seguidas. |
| Recuperar senha / username | 5 por hora por rede | Cada rodada usa 4. Espere 1 hora entre rodadas completas, ou pule com `--grep-invert "enumeração"`. |
| Formulário de Contato | 5 por hora por rede | Cada rodada usa 1. |
| Cadastros | 5 por hora por rede | A rodada completa cria mais de 5 contas: rode por partes (`--project`), com 1 hora entre elas. |

Se um teste falhar com "Muitas tentativas", foi um desses limites. Espere e rode de novo.

## Firewall da Vercel ("Vercel Security Checkpoint")

Os testes de pentest parecem um ataque de verdade, e o firewall da Vercel pode bloquear o seu IP por um tempo. Nesse caso, toda página responde 403 ou "Estamos verificando seu navegador", e os testes falham por tempo esgotado. Isso **prova que a proteção funciona**, mas impede o resto da rodada.

Para rodar a suíte inteira sem bloqueio:

1. Na Vercel, abra o projeto, vá em **Firewall** e use **Add Rule** (ou **System Bypass Rules**, se aparecer).
2. Crie a regra "se o IP for o seu → **Bypass**". Para saber o seu IP, abra https://api.ipify.org.
3. Rode os testes e **apague a regra no fim**.

Se a rodada for interrompida no meio, quando o bloqueio passar rode só a limpeza:

```powershell
npm run test:prod -- --project=cleanup
```

## O que é coberto

| Pasta | Testes |
|---|---|
| `setup/` | Admin entra uma vez. Cria a conta A (vacas e tomate, paga), a conta B (paga) e uma conta sem pagar. |
| `functional/public` | Landing PT/EN, troca de idioma, Experimente já, rodapé, cookies, Privacidade/Termos, Contato, rotas antigas, 404, robots/sitemap/manifest, domínio antigo → novo. |
| `functional/auth` | Erros do cadastro, username reservado, cidade inexistente, e-mail/username repetidos, Sair, páginas de recuperação, link de senha inventado. |
| `functional/billing` | Trava sem assinatura (telas, menu), Perfil "Ativa", portal da Stripe. |
| `functional/app` | Painel (inclui "o que plantar"), Animais e diário, Plantações, Clima, MyFarm, idioma, modo noturno, e-mails de novidades, baixar dados, trocar senha. |
| `functional/admin` | Abas, busca e filtro de assinantes, ficha, Pausar/Retomar, Leads (períodos, Local), E-mails (só prévia), Activity logs, Monitoramento. |
| `api/` | `/api/cities`, `/api/account/data`, `/api/track`, `/api/stripe/webhook` (assinatura falsa/velha, corpo enorme), `/api/cron/forecast`, `/api/unsubscribe`, `/api/dev/*` em 404, métodos errados. |
| `security/headers-session` | Cabeçalhos de segurança, HTTPS, cache de páginas logadas, cookie HttpOnly/Secure/SameSite, token novo a cada login, cookie roubado após Sair, cookie inventado. |
| `security/access` | Sem login, assinante no Admin (404), trava contra pedido direto (RSC), IDOR no diário, CSRF, escalada de privilégio (assinante usando a ação de pausar do Admin). |
| `security/injection` | XSS guardado (nome, diário) e refletido (URL), mass assignment no cadastro, SQL injection (login, busca, Leads, cidades), redirecionamento aberto, arquivos internos, `.map`, erros sem detalhes, enumeração de contas, clickjacking. |
| `ratelimit/` (opcional) | Trava da conta após 5 senhas erradas e bloqueio da rede. |

Se alguma conta de teste sobrar (por exemplo, se você interromper no meio), ela aparece em **Admin → Assinantes** com username começando por `pw`.
