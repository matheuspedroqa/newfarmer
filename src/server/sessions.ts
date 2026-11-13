import "server-only";
import { getUserById, type User } from "./accounts";
import type { Db } from "./db";
import { hashToken, newToken } from "./tokens";

// Teto absoluto de 30 dias + 3 horas sem uso (7 dias para quem marcou "Manter-me conectado"). O último uso só é regravado a cada 5 min (evita escrita a cada clique).
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
export const SESSION_IDLE_MS = 3 * 60 * 60_000;
export const SESSION_REMEMBER_IDLE_MS = 7 * 24 * 60 * 60_000;
export const SESSION_TOUCH_MS = 5 * 60_000;

export async function createSession(db: Db, userId: number, now = Date.now(), remember = false): Promise<string> {
  const token = newToken();
  await db.run("INSERT INTO sessions (user_id, token_hash, expires_at, last_seen_at, idle_ms) VALUES ($1, $2, $3, $4, $5)", [
    userId,
    hashToken(token),
    now + SESSION_TTL_MS,
    now,
    remember ? SESSION_REMEMBER_IDLE_MS : SESSION_IDLE_MS,
  ]);
  return token;
}

export async function getSessionUser(db: Db, token: string, now = Date.now()): Promise<User | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [row] = await db.query<{ user_id: number; expires_at: number; last_seen_at: number; idle_ms: number }>(
    "SELECT user_id, expires_at, last_seen_at, idle_ms FROM sessions WHERE token_hash = $1",
    [tokenHash],
  );
  if (!row) return null;
  if (row.expires_at <= now || now - row.last_seen_at > Number(row.idle_ms)) {
    await db.run("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }
  if (now - row.last_seen_at > SESSION_TOUCH_MS) {
    await db.run("UPDATE sessions SET last_seen_at = $1 WHERE token_hash = $2", [now, tokenHash]);
  }
  return getUserById(db, row.user_id);
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function deleteUserSessions(db: Db, userId: number): Promise<void> {
  await db.run("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
