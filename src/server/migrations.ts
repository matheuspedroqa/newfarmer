import "server-only";
import type { Db } from "./db";

// Horários são guardados em milissegundos (BIGINT). RLS ligado sem regras: a API pública do
// Supabase não lê nem grava nada; só o servidor do site, que entra como dono do banco.
// Migração 1 = o banco de antes das migrações; só IF NOT EXISTS, então roda também no Supabase que já tem as tabelas.
export const MIGRATIONS = [
  {
    id: 1,
    name: "base",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city_label TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  country_code TEXT NOT NULL,
  climate_zone TEXT NOT NULL,
  climate_estimated INTEGER NOT NULL DEFAULT 0,
  hemisphere TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT
);
-- Coluna nova em banco que já existia (Supabase): ADD COLUMN IF NOT EXISTS não mexe nos dados.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT;
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  attempted_at BIGINT NOT NULL,
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
CREATE TABLE IF NOT EXISTS diary_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  animal_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries (user_id, animal_id, entry_date);
CREATE TABLE IF NOT EXISTS weather_cache (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS dev_emails (
  id SERIAL PRIMARY KEY,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_emails ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    id: 2,
    name: "rate_limits",
    sql: `
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window_start BIGINT NOT NULL, count INTEGER NOT NULL);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    id: 3,
    name: "session_last_seen",
    // 30::bigint evita estouro de INTEGER (2,6 bi). Sessões antigas ganham como "último uso" o momento da criação (expires_at - 30 dias).
    sql: `
ALTER TABLE sessions ADD COLUMN last_seen_at BIGINT;
UPDATE sessions SET last_seen_at = expires_at - 30::bigint * 24 * 3600 * 1000 WHERE last_seen_at IS NULL;
ALTER TABLE sessions ALTER COLUMN last_seen_at SET NOT NULL;
`,
  },
  {
    id: 4,
    name: "activity_logs",
    // user_id sem FK: o log sobrevive se a conta for apagada, e login errado não tem conta.
    sql: `
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '', details JSONB NOT NULL DEFAULT '{}', ip TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_activity_created ON activity_logs (created_at DESC);
CREATE INDEX idx_activity_user ON activity_logs (user_id, created_at DESC);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    id: 5,
    name: "username",
    // Contas antigas ganham username a partir do e-mail. A lista de reservados repete RESERVED_USERNAMES (src/lib/username.ts).
    sql: `
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;
-- base: parte do e-mail antes do @, só caracteres permitidos, minúsculas, no máximo 30
UPDATE users SET username = left(lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')), 30);
-- curto, só números ou reservado: acrescenta "_user" (corta antes para caber em 30)
UPDATE users SET username = left(username, 25) || '_user'
  WHERE length(username) < 3 OR username ~ '^[0-9]+$'
     OR username IN ('admin','root','newfarmer','suporte','support','api','login');
-- repetidos: o mais antigo fica com o nome; os seguintes ganham o menor número livre (2, 3…),
-- conferido contra todos os usernames, para não colidir com um "ana2" que já existia.
DO $$
DECLARE r RECORD; k INT; candidate TEXT;
BEGIN
  FOR r IN SELECT id, username FROM (
    SELECT id, username, row_number() OVER (PARTITION BY username ORDER BY id) AS n FROM users
  ) d WHERE d.n > 1 ORDER BY id LOOP
    k := 2;
    LOOP
      candidate := left(r.username, 30 - length(k::text)) || k;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE username = candidate);
      k := k + 1;
    END LOOP;
    UPDATE users SET username = candidate WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX users_username_unique ON users (username);
`,
  },
  {
    id: 6,
    name: "login_attempts_identifier",
    // O login agora é por username: a coluna guarda o que foi digitado, não mais só e-mail.
    sql: `
ALTER TABLE login_attempts RENAME COLUMN email TO identifier;
DROP INDEX IF EXISTS idx_login_attempts_email;
CREATE INDEX idx_login_attempts_identifier ON login_attempts (identifier, attempted_at);
`,
  },
  {
    id: 7,
    name: "error_logs",
    // Só rota, mensagem curta e hora: nunca corpo nem cabeçalhos do pedido.
    sql: `
CREATE TABLE error_logs (id SERIAL PRIMARY KEY, at BIGINT NOT NULL, route TEXT NOT NULL, message TEXT NOT NULL);
CREATE INDEX idx_error_logs_at ON error_logs (at DESC);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    id: 8,
    name: "forecast_snapshots",
    // Registro diário do tempo do Fundão (cron da Vercel); sem dado pessoal.
    sql: `
CREATE TABLE forecast_snapshots (
  id SERIAL PRIMARY KEY, place TEXT NOT NULL, latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL, forecast_date TEXT NOT NULL, payload JSONB NOT NULL,
  created_at BIGINT NOT NULL, UNIQUE (place, forecast_date)
);
ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    id: 9,
    name: "diary_client_id",
    // Etiqueta criada no aparelho: a anotação feita sem internet pode chegar duas vezes e só grava uma.
    sql: `
ALTER TABLE diary_entries ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX idx_diary_client ON diary_entries (user_id, client_id);
`,
  },
  {
    id: 10,
    name: "etapa7",
    // Etapa 7: cada task acrescenta o seu pedaço aqui (ainda não foi para produção).
    sql: `
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
CREATE TABLE subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'none',
  currency TEXT, amount INTEGER,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  started_at BIGINT, canceled_at BIGINT,
  stripe_event_created BIGINT,
  updated_at BIGINT NOT NULL
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TABLE stripe_events (id TEXT PRIMARY KEY, received_at BIGINT NOT NULL);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
`,
  },
] as const satisfies readonly { id: number; name: string; sql: string }[];

// Trava para duas instâncias subindo juntas não aplicarem a mesma migração duas vezes.
const LOCK_ID = 7_410_001;

type Migration = { id: number; name: string; sql: string };

export async function applyMigrations(db: Db, list: readonly Migration[]): Promise<number[]> {
  await db.transaction(async (tx) => {
    await tx.run("SELECT pg_advisory_xact_lock($1)", [LOCK_ID]);
    await tx.run("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at BIGINT NOT NULL)");
    await tx.run("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
  });
  const applied: number[] = [];
  for (const m of list) {
    await db.transaction(async (tx) => {
      await tx.run("SELECT pg_advisory_xact_lock($1)", [LOCK_ID]);
      // Reconfere já com a trava: outra instância pode ter aplicado enquanto esperávamos.
      if ((await tx.query("SELECT 1 FROM schema_migrations WHERE id = $1", [m.id])).length) return;
      await tx.exec(m.sql);
      await tx.run("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [m.id, Date.now()]);
      applied.push(m.id);
    });
  }
  return applied;
}

export const migrate = (db: Db) => applyMigrations(db, MIGRATIONS);

/** Só para testes: aplica as migrações até a de número `n`. */
export const migrateUpTo = (db: Db, n: number) => applyMigrations(db, MIGRATIONS.filter((m) => m.id <= n));
