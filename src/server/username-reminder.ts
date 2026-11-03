import "server-only";
import type { Locale } from "@/i18n/locales";
import { logSafely } from "./activity-log";
import type { Db } from "./db";
import { usernameReminderEmail } from "./email-templates";
import type { Mailer } from "./mailer";

/** Sem conta com esse e-mail, não faz nada e não avisa: a tela responde igual nos dois casos. */
export async function sendUsernameReminder(
  db: Db,
  mailer: Mailer,
  input: { email: string; baseUrl: string; locale: Locale; ip?: string },
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db.query<{ id: number; name: string; username: string }>(
    "SELECT id, name, username FROM users WHERE email = $1",
    [email],
  );
  if (!user) return;

  await mailer.send({ to: email, ...usernameReminderEmail(input.locale, user.name, user.username, `${input.baseUrl}/login`) });
  await logSafely(db, { userId: user.id, action: "auth.usernameReminder", target: user.username, ip: input.ip ?? "" });
}
