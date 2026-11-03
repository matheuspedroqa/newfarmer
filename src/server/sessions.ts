import "server-only";
import { getUserById, type User } from "./accounts";
import type { Db } from "./db";
import { hashToken, newToken } from "./tokens";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export async function createSession(db: Db, userId: number, now = Date.now()): Promise<string> {
  const token = newToken();
  await db.run("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    userId,
    hashToken(token),
    now + SESSION_TTL_MS,
  ]);
  return token;
}

export async function getSessionUser(db: Db, token: string, now = Date.now()): Promise<User | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [row] = await db.query<{ user_id: number; expires_at: number }>(
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = $1",
    [tokenHash],
  );
  if (!row) return null;
  if (row.expires_at <= now) {
    await db.run("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }
  return getUserById(db, row.user_id);
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function deleteUserSessions(db: Db, userId: number): Promise<void> {
  await db.run("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
