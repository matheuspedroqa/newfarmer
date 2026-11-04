# Colocar o NewFarmer online

Código no GitHub → site na **Vercel** → dados no **Supabase** (Postgres) → e-mails pelo **Resend**.

Nenhuma senha fica em arquivo do projeto: todas vão nas **variáveis de ambiente do painel da Vercel**.
As tabelas são criadas sozinhas na primeira visita ao site, com RLS ligado (a API pública do Supabase não lê nada).

## 1. Supabase: copiar o endereço do banco

1. supabase.com → projeto `xzpxjnsvvseudbsnztdo` → botão **Connect**.
2. Escolha **Transaction pooler** (porta `6543`) e copie o endereço `postgresql://...`.
3. Troque `[YOUR-PASSWORD]` pela senha do banco (Project Settings → Database, se precisar redefinir).

## 2. Resend: chave de envio

1. resend.com → **API Keys** → criar chave (permissão "Sending access").
2. Sem domínio próprio, o remetente `onboarding@resend.dev` só entrega para o e-mail da sua conta Resend.
   Para enviar a qualquer pessoa, verifique um domínio em **Domains** e use um remetente dele.

## 3. Vercel: publicar

1. vercel.com → **Add New → Project** → importar `matheuspedroqa/newfarmer`.
2. Em **Environment Variables**, cadastre:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | endereço do passo 1 |
| `APP_URL` | endereço do site, ex. `https://newfarmer.vercel.app` (usado no link de recuperar senha) |
| `RESEND_API_KEY` | chave do passo 2 |
| `MAIL_FROM` | ex. `NewFarmer <nao-responda@seudominio.com>` (opcional; padrão `onboarding@resend.dev`) |
| `DATABASE_CA_CERT` | opcional: conteúdo do certificado do Supabase (Project Settings → Database → SSL) para conferir a conexão |

3. **Deploy**. Cada envio para a `main` no GitHub publica uma versão nova sozinho.
   Se trocar uma variável depois, use **Redeploy** para ela valer.

## No computador

Sem `DATABASE_URL`, o site usa um Postgres local (PGlite) na pasta `data/`, que não vai para o GitHub.
Para testar contra o Supabase daqui, crie `.env.local` (ignorado pelo Git) com `DATABASE_URL=...`.

## Antes de publicar mudanças no banco

- Na Vercel, em **Settings → Environment Variables**, deixe `DATABASE_URL` só em **Production** (desmarque Preview e Development).
  Motivo: a primeira visita a qualquer versão publicada aplica as migrações. Uma versão de teste (Preview) ligada ao banco real
  migraria o banco enquanto o site no ar ainda usa o código antigo.
- Faça um backup no Supabase (**Database → Backups**) antes de juntar na `main`.
- Voltar a uma versão antiga (**Instant Rollback**) depois das migrações 5 e 6 quebra login e cadastro. Para voltar seria preciso
  renomear `login_attempts.identifier` para `email` e tornar `users.username` opcional. Prefira corrigir para frente.
- Depois da migração 3, sessões com mais de 1 hora são encerradas uma vez. Depois da 5, o login passa a ser pelo username
  (contas antigas: a parte do e-mail antes do @; "Esqueci o username" envia por e-mail).

## Registro diário do tempo

Todo dia à meia-noite (UTC) a Vercel chama `/api/cron/forecast`, que guarda a previsão do Fundão para o dia seguinte.
No plano Hobby da Vercel o job roda em algum minuto entre 00:00 e 00:59 UTC.

1. Na Vercel, **Settings → Environment Variables**, crie `CRON_SECRET` em **Production** com um valor aleatório longo
   (por exemplo `openssl rand -hex 32` ou um gerador de senhas).
2. Faça **Redeploy** para a variável valer.
3. Confira em **Settings → Cron Jobs** se o job aparece e veja as execuções ali.
4. Para testar na mão: `curl -H "Authorization: Bearer <CRON_SECRET>" https://newfarmer.vercel.app/api/cron/forecast`
   (deve responder `{"ok":true,"date":"AAAA-MM-DD"}`).

## Virar dono do site (Settings)

As telas **Settings → Activity logs** e **Monitoramento** só aparecem para o dono do site; para os demais, dão 404.
Não há tela para ligar isso, de propósito. No Supabase, abra o **SQL Editor** e rode, trocando pelo seu username:

```sql
UPDATE users SET is_platform_admin = TRUE WHERE username = 'seu_username';
```

Saia e entre de novo (ou recarregue a página): o item **Settings** aparece no menu da conta, logo abaixo de **Perfil**.

## Stripe (assinatura)

1. Crie a conta em stripe.com e conclua a verificação (CPF ou CNPJ).
2. Em **Product catalog**, crie o produto com 3 preços **recorrentes mensais**: BRL 6,99, EUR 1,99 e USD 2,00. Copie o id `price_...` de cada um.
3. Em **Developers → Webhooks**, crie o endpoint `https://<site>/api/stripe/webhook` com os eventos `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`. Copie o segredo `whsec_...`.
4. Em **Settings → Billing → Customer portal**, ligue o portal e permita o cancelamento da assinatura.
5. Na Vercel, cadastre só em **Production**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BRL`, `STRIPE_PRICE_EUR`, `STRIPE_PRICE_USD`. Depois, **Redeploy**.
6. Teste primeiro com chaves `sk_test_` e o cartão `4242 4242 4242 4242`. Para vender de verdade, recrie os produtos no modo live (os ids `price_...` mudam), crie o webhook live e troque as variáveis.

Avisos:

- O plano Hobby da Vercel não permite uso comercial: é preciso o plano Pro.
- IVA da UE (OSS) e tributação no Brasil: fale com um contador antes de vender.

## Quando comprar o domínio

Não precisa mudar código.

1. **Vercel → Domains:** adicione o domínio e aponte o DNS como ela pedir.
2. **Resend → Domains:** adicione `seudominio.com` (ou `mail.seudominio.com`), crie no DNS os registros que ele mostrar (SPF/MX de retorno e DKIM) e espere ficar "Verified".
3. Crie também o registro DMARC no DNS: nome `_dmarc`, valor `v=DMARC1; p=none; rua=mailto:<seu e-mail>`.
4. Na Vercel, troque: `APP_URL=https://seudominio.com`, `MAIL_FROM=NewFarmer <nao-responda@seudominio.com>`, `MAIL_REPLY_TO=<seu e-mail de contato>` e, se quiser, `MAIL_MARKETING_FROM=NewFarmer <novidades@seudominio.com>`.
5. No Stripe, troque a URL do webhook para `https://seudominio.com/api/stripe/webhook`. O segredo `whsec_` muda: atualize `STRIPE_WEBHOOK_SECRET`.
6. **Redeploy** e teste: o cadastro recebe o e-mail de confirmação, o "esqueci a senha" chega e um e-mail de campanha de teste chega com o link de descadastro.

Todos os links dos e-mails, do sitemap, do canonical e do retorno do Stripe saem do `APP_URL`. Por isso basta trocá-lo.

## Antes de vender

- [ ] Conta Stripe verificada (CPF/CNPJ).
- [ ] 3 preços mensais criados (BRL, EUR, USD).
- [ ] Webhook criado com os 3 eventos.
- [ ] Customer Portal ligado, com cancelamento.
- [ ] 5 variáveis do Stripe em Production.
- [ ] Plano Pro da Vercel (o Hobby não permite uso comercial).
- [ ] Plano comercial do Open-Meteo.
- [ ] Domínio próprio verificado no Resend.
- [ ] IVA/OSS para clientes da UE e tributação no Brasil, com um contador.
- [ ] Termos e Política revisados por um advogado.
