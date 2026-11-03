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
