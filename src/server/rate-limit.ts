import "server-only";
import type { Db } from "./db";

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  recovery: { limit: 5, windowMs: 60 * 60_000 },
  citySearch: { limit: 60, windowMs: 60_000 },
  track: { limit: 120, windowMs: 60_000 },
  unsubscribe: { limit: 30, windowMs: 15 * 60_000 },
  write: { limit: 120, windowMs: 60_000 },
} as const;

/** Janela fixa num só comando atômico: funciona com várias máquinas da Vercel ao mesmo tempo. */
export async function hit(db: Db, key: string, limit: number, windowMs: number, now = Date.now()) {
  const [row] = await db.query<{ window_start: number; count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key) DO UPDATE SET
       window_start = CASE WHEN rate_limits.window_start + $3 <= $2 THEN $2 ELSE rate_limits.window_start END,
       count = CASE WHEN rate_limits.window_start + $3 <= $2 THEN 1 ELSE rate_limits.count + 1 END
     RETURNING window_start, count`,
    [key, now, windowMs],
  );
  // firstBlock: só o primeiro bloqueio da janela vai para o registro (uma enxurrada não enche activity_logs).
  return row.count <= limit
    ? { ok: true, retryAfterMs: 0, firstBlock: false }
    : { ok: false, retryAfterMs: row.window_start + windowMs - now, firstBlock: row.count === limit + 1 };
}

/** Limite por IP. Sem cabeçalho de IP ("local", só acontece em desenvolvimento/testes) não limita; em produção limita como qualquer IP. */
export function limitByIp(db: Db, name: "login" | "signup" | "recovery" | "citySearch" | "track" | "unsubscribe", ip: string, now?: number) {
  if (ip === "local" && process.env.NODE_ENV !== "production") return Promise.resolve({ ok: true, retryAfterMs: 0, firstBlock: false });
  return hit(db, `${name}:${ip}`, RATE_LIMITS[name].limit, RATE_LIMITS[name].windowMs, now);
}

/** Limite de gravações por conta (vale sempre). */
export const limitWrites = (db: Db, userId: number) =>
  hit(db, `write:${userId}`, RATE_LIMITS.write.limit, RATE_LIMITS.write.windowMs);

/** Para a limpeza da Task 6. */
export const purgeRateLimits = (db: Db, now = Date.now()) =>
  db.run("DELETE FROM rate_limits WHERE window_start < $1", [now - 86_400_000]);
