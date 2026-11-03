import "server-only";
import type { Locale } from "@/i18n/locales";
import { normalizeUsername } from "@/lib/username";
import { setPassword } from "./accounts";
import { logSafely } from "./activity-log";
import type { Db } from "./db";
import { resetEmail } from "./email-templates";
import type { Mailer } from "./mailer";
import { deleteUserSessions } from "./sessions";
import { hashToken, newToken } from "./tokens";

export const RESET_TTL_MS = 60 * 60_000;

export async function requestPasswordReset(
  db: Db,
  mailer: Mailer,
  input: { identifier: string; baseUrl: string; locale: Locale; ip?: string },
  now = Date.now(),
): Promise<void> {
  const raw = input.identifier.trim();
  const byEmail = raw.includes("@");
  const [user] = await db.query<{ id: number; name: string; email: string; username: string }>(
    byEmail
      ? "SELECT id, name, email, username FROM users WHERE email = $1"
      : "SELECT id, name, email, username FROM users WHERE username = $1",
    [byEmail ? raw.toLowerCase() : normalizeUsername(raw)],
  );
  if (!user) return;

  const token = newToken();
  await db.run("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    user.id,
    hashToken(token),
    now + RESET_TTL_MS,
  ]);

  await mailer.send({ to: user.email, ...resetEmail(input.locale, user.name, `${input.baseUrl}/recuperar/${token}`) });
  await logSafely(db, {
    userId: user.id,
    action: "auth.passwordReset",
    target: user.username,
    details: { step: "requested" },
    ip: input.ip ?? "",
  });
}

export async function resetPassword(
  db: Db,
  input: { token: string; password: string; ip?: string },
  now = Date.now(),
): Promise<"ok" | "expired"> {
  // Confere e marca como usado num só comando: dois envios ao mesmo tempo não usam o link duas vezes.
  const [row] = await db.query<{ user_id: number }>(
    `UPDATE password_reset_tokens SET used_at = $1
     WHERE token_hash = $2 AND used_at IS NULL AND expires_at > $1 RETURNING user_id`,
    [now, hashToken(input.token)],
  );
  if (!row) return "expired";

  await setPassword(db, row.user_id, input.password);
  await deleteUserSessions(db, row.user_id);
  await logSafely(db, { userId: row.user_id, action: "auth.passwordReset", details: { step: "completed" }, ip: input.ip ?? "" });
  return "ok";
}
