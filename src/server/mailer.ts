import "server-only";
import type { Db } from "./db";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export function createDevInboxMailer(db: Db): Mailer {
  return {
    async send({ to, subject, html }) {
      await db.run("INSERT INTO dev_emails (to_address, subject, body_html, created_at) VALUES ($1, $2, $3, $4)", [
        to,
        subject,
        html,
        Date.now(),
      ]);
    },
  };
}

export function createResendMailer(apiKey: string, from: string, fetchFn: typeof fetch = fetch): Mailer {
  return {
    async send({ to, subject, html }) {
      const response = await fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!response.ok) throw new Error(`Resend respondeu ${response.status}`);
    },
  };
}

/** Online usa o Resend; no computador, a caixa de teste (/dev/inbox). */
export function getMailer(db: Db): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return createResendMailer(apiKey, process.env.MAIL_FROM ?? "NewFarmer <onboarding@resend.dev>");
  if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurada");
  return createDevInboxMailer(db);
}

export async function listDevEmails(db: Db) {
  const rows = await db.query<{ id: number; to_address: string; subject: string; body_html: string; created_at: number }>(
    "SELECT id, to_address, subject, body_html, created_at FROM dev_emails ORDER BY id DESC",
  );
  return rows.map((r) => ({ id: r.id, to: r.to_address, subject: r.subject, html: r.body_html, createdAt: r.created_at }));
}
