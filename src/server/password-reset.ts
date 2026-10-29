import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import type { Locale } from "@/i18n/locales";
import { setPassword } from "./accounts";
import type { Db } from "./db";
import type { Mailer } from "./mailer";
import { deleteUserSessions } from "./sessions";
import { hashToken, newToken } from "./tokens";

export const RESET_TTL_MS = 60 * 60_000;

const EMAIL_TEXTS = { pt: pt.email, en: en.email };

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function requestPasswordReset(
  db: Db,
  mailer: Mailer,
  input: { email: string; baseUrl: string; locale: Locale },
  now = Date.now(),
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const user = db.prepare("SELECT id, name FROM users WHERE email = ?").get(email) as
    | { id: number; name: string }
    | undefined;
  if (!user) return;

  const token = newToken();
  db.prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    user.id,
    hashToken(token),
    now + RESET_TTL_MS,
  );

  const texts = EMAIL_TEXTS[input.locale];
  const link = `${input.baseUrl}/recuperar/${token}`;
  await mailer.send({
    to: email,
    subject: texts.resetSubject,
    html: texts.resetBody.replaceAll("{name}", escapeHtml(user.name)).replaceAll("{link}", link),
  });
}

export async function resetPassword(
  db: Db,
  input: { token: string; password: string },
  now = Date.now(),
): Promise<"ok" | "expired"> {
  const row = db
    .prepare("SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?")
    .get(hashToken(input.token)) as
    | { id: number; user_id: number; expires_at: number; used_at: number | null }
    | undefined;
  if (!row || row.used_at !== null || row.expires_at <= now) return "expired";

  db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(now, row.id);
  await setPassword(db, row.user_id, input.password);
  deleteUserSessions(db, row.user_id);
  return "ok";
}
