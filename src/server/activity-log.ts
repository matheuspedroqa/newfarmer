import "server-only";
import { normalizeUsername, usernameProblem } from "@/lib/username";
import type { LoginResult } from "./accounts";
import type { Db } from "./db";
import { purgeRateLimits } from "./rate-limit";
import { SESSION_IDLE_MS } from "./sessions";

export const ACTIVITY_ACTIONS = [
  "auth.login",
  "auth.loginFailed",
  "auth.logout",
  "auth.signup",
  "auth.passwordChanged",
  "auth.passwordReset",
  "auth.usernameReminder",
  "auth.emailConfirmed",
  "farm.updated",
  "diary.created",
  "diary.deleted",
  "profile.updated",
  "account.exported",
  "account.deleted",
  "security.rateLimited",
  "billing.checkoutStarted",
  "billing.subscriptionChanged",
  "admin.viewedUser",
  "admin.subscriptionPaused",
  "admin.subscriptionResumed",
  "marketing.optInChanged",
  "marketing.campaignSent",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

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
export const LOGIN_ATTEMPTS_RETENTION_MS = 30 * 24 * 60 * 60_000;
export const STRIPE_EVENTS_RETENTION_MS = 30 * 24 * 60 * 60_000;
export const WEATHER_CACHE_RETENTION_MS = 7 * 24 * 60 * 60_000;
const FORBIDDEN_KEY = /pass|token|hash|secret/i;

type LogInput = {
  userId: number | null;
  action: ActivityAction;
  target?: string;
  details?: Record<string, string | number | boolean>;
  ip: string;
};

export async function logActivity(
  db: Db,
  entry: LogInput,
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

/** Registro nunca derruba a ação do usuário: falha vai para o console. */
export async function logSafely(db: Db, entry: LogInput): Promise<void> {
  try {
    await logActivity(db, entry);
  } catch (error) {
    console.error("Falha ao gravar registro de atividade", error);
  }
}

/** Bloqueio pelo limite de gravações por conta. */
export const logWriteLimited = (db: Db, userId: number, target: string, ip: string) =>
  logSafely(db, { userId, action: "security.rateLimited", target, details: { limit: "write" }, ip });

/** Login certo vira auth.login; errado vira auth.loginFailed (sem conta, com o username digitado). */
export function logLoginAttempt(db: Db, typedUsername: string, result: LoginResult, ip: string): Promise<void> {
  const target = loginTarget(typedUsername);
  return result.ok
    ? logSafely(db, { userId: result.userId, action: "auth.login", target, ip })
    : logSafely(db, {
        userId: null,
        action: "auth.loginFailed",
        target,
        details: target ? { reason: result.reason } : { reason: result.reason, input: "invalid" },
        ip,
      });
}

/** Só guarda o que tem cara de username: quem digita a senha no campo errado não a vê no registro. */
export function loginTarget(typedUsername: string): string {
  const normalized = normalizeUsername(typedUsername);
  return usernameProblem(normalized) === null ? normalized : "";
}

type ActivityFilter = { userId?: number; target?: string; action?: ActivityAction; before?: number; limit?: number };

const filterParams = ({ userId, target, action, before, limit = 50 }: ActivityFilter) => [
  userId ?? null,
  target ?? null,
  action ?? null,
  Number.isFinite(before) ? before : null,
  // NaN no limite (ex.: ?limit=abc) quebraria a consulta: volta para 50.
  Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 200) : 50,
];

/** Mais novo primeiro. `before` é o createdAt do último item da página anterior. */
export function listActivity(db: Db, filter: ActivityFilter): Promise<ActivityEntry[]> {
  return db.query<ActivityEntry>(
    `SELECT id, user_id AS "userId", action, target, details, ip, created_at AS "createdAt"
     FROM activity_logs
     WHERE (($1::int IS NULL AND $2::text IS NULL) OR user_id = $1 OR target = $2) AND ($3::text IS NULL OR action = $3) AND ($4::bigint IS NULL OR created_at < $4)
     ORDER BY created_at DESC, id DESC LIMIT $5`,
    filterParams(filter),
  );
}

/** Igual a listActivity, com o username da conta (null quando não há conta ou ela foi apagada). */
export function listActivityWithUsernames(db: Db, filter: ActivityFilter): Promise<(ActivityEntry & { username: string | null })[]> {
  return db.query(
    `SELECT a.id, a.user_id AS "userId", u.username, a.action, a.target, a.details, a.ip, a.created_at AS "createdAt"
     FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE (($1::int IS NULL AND $2::text IS NULL) OR a.user_id = $1 OR a.target = $2) AND ($3::text IS NULL OR a.action = $3) AND ($4::bigint IS NULL OR a.created_at < $4)
     ORDER BY a.created_at DESC, a.id DESC LIMIT $5`,
    filterParams(filter),
  );
}

export async function purgeOld(db: Db, now = Date.now()): Promise<void> {
  await db.run("DELETE FROM activity_logs WHERE created_at < $1", [now - ACTIVITY_RETENTION_MS]);
  await db.run("DELETE FROM login_attempts WHERE attempted_at < $1", [now - LOGIN_ATTEMPTS_RETENTION_MS]);
  await db.run("DELETE FROM stripe_events WHERE received_at < $1", [now - STRIPE_EVENTS_RETENTION_MS]);
  await db.run("DELETE FROM weather_cache WHERE fetched_at < $1", [now - WEATHER_CACHE_RETENTION_MS]);
  await db.run("DELETE FROM error_logs WHERE at < $1", [now - ACTIVITY_RETENTION_MS]);
  // Sessão vencida ou parada além do prazo de inatividade, e tokens vencidos (link vencido continua dando "expirado").
  await db.run("DELETE FROM sessions WHERE expires_at < $1 OR last_seen_at < $2", [now, now - SESSION_IDLE_MS]);
  await db.run("DELETE FROM password_reset_tokens WHERE expires_at < $1", [now]);
  await db.run("DELETE FROM email_verification_tokens WHERE expires_at < $1", [now]);
  await db.run("DELETE FROM page_views WHERE created_at < $1", [now - ACTIVITY_RETENTION_MS]);
  await purgeRateLimits(db, now);
}
