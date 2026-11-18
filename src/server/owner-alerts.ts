import "server-only";
import { contactInbox } from "./contact";
import type { Db } from "./db";
import { escapeHtml } from "./email-templates";
import { getMailer, type Mailer } from "./mailer";
import { logRequestError } from "./monitoring";
import { hit } from "./rate-limit";

const SUBJECTS = {
  register: "Alguém abriu a página de cadastro",
  trial: "Alguém clicou em Testar 3 dias grátis",
} as const;
export type OwnerAlert = keyof typeof SUBJECTS;

/**
 * Avisa o dono do site por e-mail (CONTACT_EMAIL, padrão contact@newfarmer.app).
 * No máximo 1 aviso por IP a cada hora e 60 por dia de cada tipo, para robôs não lotarem a caixa.
 * Nunca derruba a tela de quem visita: falha vai só para Admin > Monitoramento.
 */
export async function alertOwner(db: Db, kind: OwnerAlert, details: Record<string, string>, ip: string, mailer?: Mailer, now = Date.now()): Promise<boolean> {
  try {
    if (!(await hit(db, `alert:${kind}:${ip}`, 1, 3_600_000, now)).ok) return false;
    if (!(await hit(db, `alert:${kind}:day`, 60, 86_400_000, now)).ok) return false;
    const rows = Object.entries(details).filter(([, v]) => v).map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`).join("<br>");
    await (mailer ?? getMailer(db)).send({ to: contactInbox(), subject: `NewFarmer: ${SUBJECTS[kind]}`, html: `<p>${SUBJECTS[kind]}.</p><p>${rows}</p>` });
    return true;
  } catch (error) {
    await logRequestError(db, `alert:${kind}`, error instanceof Error ? error.message : String(error)).catch(() => undefined);
    return false;
  }
}
