import "server-only";
import { LOCK_WINDOW_MS, MAX_FAILED_LOGINS } from "./accounts";
import type { Db } from "./db";

const DIA = 24 * 60 * 60_000;

export type PlatformStats = {
  users: number;
  newUsers7d: number;
  activeSessions: number;
  logins24h: { ok: number; failed: number };
  lockedAccounts: number;
  rateLimited24h: number;
  errors24h: number;
  recentErrors: { at: number; route: string; message: string }[];
  dbLatencyMs: number;
  weatherCacheEntries: number;
};

/** Só números para a tela de Monitoramento: nada de e-mails, nomes ou dados das contas. */
export async function getPlatformStats(db: Db, now = Date.now()): Promise<PlatformStats> {
  const started = performance.now();
  await db.query("SELECT 1");
  const dbLatencyMs = Math.round(performance.now() - started);

  const [row] = await db.query<Omit<PlatformStats, "logins24h" | "recentErrors" | "dbLatencyMs"> & { loginsOk: number; loginsFailed: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM users) AS users,
       (SELECT COUNT(*)::int FROM users WHERE created_at > $1) AS "newUsers7d",
       (SELECT COUNT(*)::int FROM sessions WHERE expires_at > $2 AND last_seen_at >= $3 - idle_ms) AS "activeSessions",
       (SELECT COUNT(*)::int FROM activity_logs WHERE action = 'auth.login' AND created_at > $4) AS "loginsOk",
       (SELECT COUNT(*)::int FROM activity_logs WHERE action = 'auth.loginFailed' AND created_at > $4) AS "loginsFailed",
       (SELECT COUNT(*)::int FROM activity_logs WHERE action = 'security.rateLimited' AND created_at > $4) AS "rateLimited24h",
       (SELECT COUNT(*)::int FROM error_logs WHERE at > $4) AS "errors24h",
       (SELECT COUNT(*)::int FROM weather_cache) AS "weatherCacheEntries",
       -- mesma regra de isLocked (accounts.ts): erros na janela, depois do último acerto
       (SELECT COUNT(*)::int FROM (
          SELECT f.identifier FROM login_attempts f
          WHERE f.success = 0 AND f.attempted_at > $5
            AND f.attempted_at > COALESCE((SELECT MAX(s.attempted_at) FROM login_attempts s WHERE s.identifier = f.identifier AND s.success = 1), 0)
          GROUP BY f.identifier HAVING COUNT(*) >= $6
        ) l) AS "lockedAccounts"`,
    [now - 7 * DIA, now, now, now - DIA, now - LOCK_WINDOW_MS, MAX_FAILED_LOGINS],
  );
  const recentErrors = await db.query<{ at: number; route: string; message: string }>(
    "SELECT at, route, message FROM error_logs ORDER BY at DESC, id DESC LIMIT 50",
  );
  const { loginsOk, loginsFailed, ...rest } = row;
  return { ...rest, logins24h: { ok: loginsOk, failed: loginsFailed }, recentErrors, dbLatencyMs };
}

/** Chamado por onRequestError (src/instrumentation.ts). */
export async function logRequestError(db: Db, route: string, message: string, now = Date.now()): Promise<void> {
  await db.run("INSERT INTO error_logs (at, route, message) VALUES ($1, $2, $3)", [now, route.slice(0, 300), message.slice(0, 300)]);
}
