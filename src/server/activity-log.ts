import "server-only";
import type { Db } from "./db";
import { purgeRateLimits } from "./rate-limit";

export type ActivityAction =
  | "auth.login"
  | "auth.loginFailed"
  | "auth.logout"
  | "auth.signup"
  | "auth.passwordChanged"
  | "auth.passwordReset"
  | "auth.emailConfirmed"
  | "farm.updated"
  | "diary.created"
  | "diary.deleted"
  | "profile.updated"
  | "security.rateLimited";

export type ActivityEntry = {
  id: number;
  userId: number | null;
  action: ActivityAction;
  target: string;
  details: Record<string, string | number | boolean>;
  ip: string;
  createdAt: number;
};

export const ACTIVITY_RETENTION_MS = 180 * 24 * 60 * 60_000;
const FORBIDDEN_KEY = /pass|token|hash|secret/i;

export async function logActivity(
  db: Db,
  entry: {
    userId: number | null;
    action: ActivityAction;
    target?: string;
    details?: Record<string, string | number | boolean>;
    ip: string;
  },
  now = Date.now(),
  random: () => number = Math.random,
): Promise<void> {
  const details = entry.details ?? {};
  for (const key of Object.keys(details)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error(`Registro de atividades: guardar a chave é proibido: ${key}`);
  }
  await db.run(
    `INSERT INTO activity_logs (user_id, action, target, details, ip, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [entry.userId, entry.action, (entry.target ?? "").slice(0, 200), JSON.stringify(details), entry.ip, now],
  );
  // shortcut: a limpeza depende do movimento do site; quando houver Vercel Cron, mova para lá.
  if (random() < 0.005) await purgeOld(db, now).catch((e) => console.error("Falha ao limpar registros antigos", e));
}

/** Mais novo primeiro. `before` é o createdAt do último item da página anterior. */
export function listActivity(
  db: Db,
  { userId, action, before, limit = 50 }: { userId?: number; action?: ActivityAction; before?: number; limit?: number },
): Promise<ActivityEntry[]> {
  return db.query<ActivityEntry>(
    `SELECT id, user_id AS "userId", action, target, details, ip, created_at AS "createdAt"
     FROM activity_logs
     WHERE ($1::int IS NULL OR user_id = $1) AND ($2::text IS NULL OR action = $2) AND ($3::bigint IS NULL OR created_at < $3)
     ORDER BY created_at DESC, id DESC LIMIT $4`,
    [userId ?? null, action ?? null, before ?? null, Math.min(Math.max(limit, 1), 200)],
  );
}

export async function purgeOld(db: Db, now = Date.now()): Promise<void> {
  await db.run("DELETE FROM activity_logs WHERE created_at < $1", [now - ACTIVITY_RETENTION_MS]);
  await purgeRateLimits(db, now);
}
