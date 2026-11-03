import "server-only";
import type { Locale } from "@/i18n/locales";
import type { Db } from "./db";
import { verifyEmail } from "./email-templates";
import type { Mailer } from "./mailer";
import { hashToken, newToken } from "./tokens";

export const VERIFY_TTL_MS = 7 * 24 * 60 * 60_000;
export const VERIFY_RESEND_WAIT_MS = 60_000;

export type SendVerificationResult = "sent" | "tooSoon" | "alreadyVerified";

export async function sendVerificationEmail(
  db: Db,
  mailer: Mailer,
  input: { userId: number; baseUrl: string; locale: Locale },
  now = Date.now(),
): Promise<SendVerificationResult> {
  const [user] = await db.query<{ name: string; email: string; email_verified_at: number | null }>(
    "SELECT name, email, email_verified_at FROM users WHERE id = $1",
    [input.userId],
  );
  if (!user || user.email_verified_at !== null) return "alreadyVerified";

  // Um link por minuto: o botão "Reenviar" não vira uma forma de lotar a caixa de alguém.
  const [{ last }] = await db.query<{ last: number | null }>(
    "SELECT MAX(created_at) AS last FROM email_verification_tokens WHERE user_id = $1",
    [input.userId],
  );
  if (last !== null && now - last < VERIFY_RESEND_WAIT_MS) return "tooSoon";

  const token = newToken();
  await db.run(
    "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [input.userId, hashToken(token), now + VERIFY_TTL_MS, now],
  );
  await mailer.send({ to: user.email, ...verifyEmail(input.locale, user.name, `${input.baseUrl}/confirmar/${token}`) });
  return "sent";
}

/** O link pode ser aberto várias vezes até vencer: antivírus de e-mail costumam abrir antes da pessoa. */
export async function confirmEmail(db: Db, token: string, now = Date.now()): Promise<"ok" | "expired"> {
  const [row] = await db.query<{ id: number }>(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, $1)
     FROM email_verification_tokens t
     WHERE t.token_hash = $2 AND t.expires_at > $1 AND users.id = t.user_id RETURNING users.id`,
    [now, hashToken(token)],
  );
  return row ? "ok" : "expired";
}
