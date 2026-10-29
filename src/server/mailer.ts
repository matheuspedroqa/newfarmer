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
      db.prepare("INSERT INTO dev_emails (to_address, subject, body_html, created_at) VALUES (?, ?, ?, ?)").run(
        to,
        subject,
        html,
        Date.now(),
      );
    },
  };
}

export function listDevEmails(db: Db) {
  const rows = db
    .prepare("SELECT id, to_address, subject, body_html, created_at FROM dev_emails ORDER BY id DESC")
    .all() as { id: number; to_address: string; subject: string; body_html: string; created_at: number }[];
  return rows.map((r) => ({ id: r.id, to: r.to_address, subject: r.subject, html: r.body_html, createdAt: r.created_at }));
}
