import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

/** Banco Postgres: Supabase online (DATABASE_URL) ou PGlite no computador e nos testes. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Devolve quantas linhas foram afetadas. */
  run(sql: string, params?: unknown[]): Promise<number>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

// Horários são guardados em milissegundos (BIGINT). RLS ligado sem regras: a API pública do
// Supabase não lê nem grava nada; só o servidor do site, que entra como dono do banco.
export const SCHEMA = `
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
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_emails ENABLE ROW LEVEL SECURITY;
`;

type PgQueryable = pg.Pool | pg.PoolClient;

function pgDb(conn: PgQueryable): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await conn.query(sql, params)).rows as T[];
    },
    async run(sql, params = []) {
      return (await conn.query(sql, params)).rowCount ?? 0;
    },
    async transaction(fn) {
      if (!(conn instanceof pg.Pool)) return fn(this);
      const client = await conn.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(pgDb(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

type PgliteQueryable = Pick<PGlite, "query">;

function pgliteDb(conn: PgliteQueryable, root?: PGlite): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await conn.query<T>(sql, params)).rows;
    },
    async run(sql, params = []) {
      return (await conn.query(sql, params)).affectedRows ?? 0;
    },
    async transaction(fn) {
      return root ? root.transaction((tx) => fn(pgliteDb(tx))) : fn(this);
    },
  };
}

/** Banco novo em memória, já com as tabelas (testes). */
export async function openMemoryDb(): Promise<Db> {
  const lite = new PGlite();
  await lite.exec(SCHEMA);
  return pgliteDb(lite, lite);
}

async function openShared(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    pg.types.setTypeParser(pg.types.builtins.INT8, Number);
    const ca = process.env.DATABASE_CA_CERT;
    const pool = new pg.Pool({
      connectionString: url,
      max: 3,
      // shortcut: sem DATABASE_CA_CERT o certificado do Supabase não é conferido; cole o certificado do painel do Supabase nessa variável para conferir.
      ssl: ca ? { ca } : { rejectUnauthorized: false },
    });
    await pool.query(SCHEMA);
    return pgDb(pool);
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL não configurada no painel da Vercel");
  const dir = process.env.DATABASE_PATH ?? "data/pglite";
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const lite = new PGlite(dir);
  await lite.exec(SCHEMA);
  return pgliteDb(lite, lite);
}

// Guardado no globalThis para o recarregamento do modo de desenvolvimento não abrir o banco duas vezes.
const holder = globalThis as unknown as { __nfDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  holder.__nfDb ??= openShared().catch((error) => {
    holder.__nfDb = undefined;
    throw error;
  });
  return holder.__nfDb;
}
