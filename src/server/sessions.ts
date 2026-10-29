import { getUserById, type User } from "./accounts";
import type { Db } from "./db";
import { hashToken, newToken } from "./tokens";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export function createSession(db: Db, userId: number, now = Date.now()): string {
  const token = newToken();
  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    userId,
    hashToken(token),
    now + SESSION_TTL_MS,
  );
  return token;
}

export function getSessionUser(db: Db, token: string, now = Date.now()): User | null {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash) as
    | { user_id: number; expires_at: number }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= now) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return getUserById(db, row.user_id);
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: number): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
