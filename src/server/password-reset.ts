import type { Locale } from "@/i18n/locales";
import { setPassword } from "./accounts";
import type { Db } from "./db";
import { resetEmail } from "./email-templates";
import type { Mailer } from "./mailer";
import { deleteUserSessions } from "./sessions";
import { hashToken, newToken } from "./tokens";

export const RESET_TTL_MS = 60 * 60_000;

export async function requestPasswordReset(
  db: Db,
  mailer: Mailer,
  input: { email: string; baseUrl: string; locale: Locale },
  now = Date.now(),
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db.query<{ id: number; name: string }>("SELECT id, name FROM users WHERE email = $1", [email]);
  if (!user) return;

  const token = newToken();
  await db.run("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    user.id,
    hashToken(token),
    now + RESET_TTL_MS,
  ]);

  await mailer.send({ to: email, ...resetEmail(input.locale, user.name, `${input.baseUrl}/recuperar/${token}`) });
}

export async function resetPassword(
  db: Db,
  input: { token: string; password: string },
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
  return "ok";
}
