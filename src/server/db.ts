import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { migrate } from "./migrations";

/** Banco Postgres: Supabase online (DATABASE_URL) ou PGlite no computador e nos testes. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Devolve quantas linhas foram afetadas. */
  run(sql: string, params?: unknown[]): Promise<number>;
  /** Vários comandos de uma vez, sem parâmetros. */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

type PgQueryable = pg.Pool | pg.PoolClient;

function pgDb(conn: PgQueryable): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await conn.query(sql, params)).rows as T[];
    },
    async run(sql, params = []) {
      return (await conn.query(sql, params)).rowCount ?? 0;
    },
    async exec(sql) {
      await conn.query(sql);
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

type PgliteQueryable = Pick<PGlite, "query" | "exec">;

export function pgliteDb(conn: PgliteQueryable, root?: PGlite): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await conn.query<T>(sql, params)).rows;
    },
    async run(sql, params = []) {
      return (await conn.query(sql, params)).affectedRows ?? 0;
    },
    async exec(sql) {
      await conn.exec(sql);
    },
    async transaction(fn) {
      return root ? root.transaction((tx) => fn(pgliteDb(tx))) : fn(this);
    },
  };
}

/** Banco novo em memória, já com as tabelas (testes). */
export async function openMemoryDb(): Promise<Db> {
  const lite = new PGlite();
  const db = pgliteDb(lite, lite);
  await migrate(db);
  return db;
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
    const db = pgDb(pool);
    await migrate(db);
    return db;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL não configurada no painel da Vercel");
  const dir = process.env.DATABASE_PATH ?? "data/pglite";
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const lite = new PGlite(dir);
  const db = pgliteDb(lite, lite);
  await migrate(db);
  return db;
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
