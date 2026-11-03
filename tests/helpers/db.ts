import { openMemoryDb, type Db } from "@/server/db";

// Abrir um Postgres em memória leva ~1,5 s: um por arquivo de teste, limpo antes de cada teste.
let shared: Promise<Db> | undefined;

export async function testDb(): Promise<Db> {
  const db = await (shared ??= openMemoryDb());
  const tables = await db.query<{ name: string }>(
    "SELECT relname AS name FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace",
  );
  await db.run(`TRUNCATE ${tables.map((t) => t.name).join(", ")} RESTART IDENTITY CASCADE`);
  return db;
}
