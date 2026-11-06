import "server-only";
import { randomBytes } from "node:crypto";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import pt from "../../messages/pt.json";
import { resolveLocale, type Locale } from "@/i18n/locales";
import { CROPS } from "@/lib/catalog";
import type { KnowledgeCountry } from "@/lib/countries";
import { COUNTRY_CLIMATES, guidePath, monthName } from "@/lib/plant-guide";
import { monthlyTasks, plantableThisMonth } from "@/lib/seasons";
import { getAllCropContent } from "./content";
import type { Db } from "./db";
import { escapeHtml, renderEmail } from "./email-templates";
import type { Mailer } from "./mailer";

const M = { pt, en, es };
const DAY = 86_400_000;

/** O que semear ou transplantar no mês, em cada clima do país (a colheita fica de fora). */
export function guideZones(country: KnowledgeCountry, month: number) {
  const { hemisphere, zones } = COUNTRY_CLIMATES[country];
  const crops = getAllCropContent();
  return zones.map((zone) => {
    const plantable = plantableThisMonth(crops, zone, hemisphere, month);
    const tasks = monthlyTasks(crops.filter((c) => plantable.includes(c.id)), zone, hemisphere, month)
      .map((task) => ({ ...task, activities: task.activities.filter((a) => a !== "harvest") }));
    return { zone, tasks };
  });
}

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");

/** Pedido do formulário: cria (ou reaproveita, se ainda não confirmou ou se descadastrou) e manda o e-mail de confirmação. Inscrito ativo não recebe nada. */
export async function subscribeToGuide(db: Db, mailer: Mailer, p: { email: string; country: KnowledgeCountry; locale: Locale; appUrl: string }, now = Date.now()) {
  const [row] = await db.query<{ token: string }>(
    `INSERT INTO guide_subscribers (email, country, locale, token, created_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email, country) DO UPDATE SET locale = EXCLUDED.locale
     WHERE guide_subscribers.confirmed_at IS NULL OR guide_subscribers.unsubscribed_at IS NOT NULL
     RETURNING token`,
    [p.email, p.country, p.locale, randomBytes(32).toString("base64url"), now],
  );
  if (!row) return;
  const t = M[p.locale];
  await mailer.send({
    to: p.email,
    subject: t.email.guideConfirmSubject,
    html: renderEmail({
      locale: p.locale, name: "", title: t.email.guideConfirmTitle, intro: fill(t.email.guideConfirmIntro, { inCountry: t.guide.inCountry[p.country] }),
      button: t.email.guideConfirmButton, link: `${p.appUrl}/confirm-guide/${row.token}`, note: t.email.guideConfirmNote,
    }),
  });
}

/** Link do e-mail de confirmação (também reativa quem tinha descadastrado). Devolve o idioma de quem pediu, ou null se o link não vale. */
export async function confirmGuide(db: Db, token: string, now = Date.now()): Promise<Locale | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db.query<{ locale: string }>(
    "UPDATE guide_subscribers SET confirmed_at = COALESCE(confirmed_at, $2), unsubscribed_at = NULL WHERE token = $1 RETURNING locale",
    [token, now],
  );
  return row ? resolveLocale(row.locale) : null;
}

/** Descadastrar só marca a inscrição como desligada: o e-mail fica no banco, mas não recebe mais. */
export async function unsubscribeGuide(db: Db, token: string, now = Date.now()): Promise<boolean> {
  if (!token || token.length > 100) return false;
  return (await db.query("UPDATE guide_subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, $2) WHERE token = $1 RETURNING id", [token, now])).length > 0;
}

export function guideMonthlyEmail(p: { locale: Locale; country: KnowledgeCountry; month: number; appUrl: string; unsubscribeUrl: string }) {
  const t = M[p.locale];
  const vars = { month: monthName(p.locale, p.month), inCountry: t.guide.inCountry[p.country] };
  const zones = guideZones(p.country, p.month).map(({ zone, tasks }) => {
    const items = tasks.length
      ? tasks.map((task) => `${CROPS.find((c) => c.id === task.cropId)!.icon} ${escapeHtml(t.crops[task.cropId])} · ${escapeHtml(task.activities.map((a) => t.activities[a]).join(", "))}`).join("<br>")
      : escapeHtml(t.guide.zoneEmpty);
    return `<strong>${escapeHtml(fill(t.guide.zoneTitle, { zone: t.climate[zone] }))}</strong><br>${items}`;
  });
  const title = fill(t.guide.title, vars);
  const intro = fill(t.email.guideMonthlyIntro, vars);
  const footerHtml = `${escapeHtml(t.email.guideFooter)} <a href="${escapeHtml(p.unsubscribeUrl)}" style="color:#3f6b3a;">${escapeHtml(t.email.unsubscribe)}</a>`;
  return {
    subject: title.charAt(0).toUpperCase() + title.slice(1),
    html: renderEmail({
      locale: p.locale, name: "", title, intro, introHtml: `${escapeHtml(intro)}<br><br>${zones.join("<br><br>")}`,
      button: t.email.guideMonthlyButton, link: `${p.appUrl}${guidePath(p.locale, p.country, p.month)}`, note: t.guide.ctaText, footerHtml,
    }),
  };
}

/**
 * Cron diário: manda o mês atual a quem confirmou e ainda não recebeu este mês (no dia 1 vai quase todo mundo;
 * quem confirma no meio do mês recebe no dia seguinte). Também apaga pedidos não confirmados há mais de 30 dias.
 */
export async function sendMonthlyGuides(db: Db, mailer: Mailer, { appUrl, now = Date.now(), max = 80, pauseMs = 600 }: { appUrl: string; now?: number; max?: number; pauseMs?: number }) {
  await db.run("DELETE FROM guide_subscribers WHERE confirmed_at IS NULL AND created_at < $1", [now - 30 * DAY]);
  const key = new Date(now).toISOString().slice(0, 7);
  const month = new Date(now).getUTCMonth() + 1;
  // Reserva numa só instrução: dois crons ao mesmo tempo nunca mandam o mesmo e-mail duas vezes.
  const batch = await db.query<{ id: number; email: string; country: KnowledgeCountry; locale: string; token: string }>(
    `UPDATE guide_subscribers SET last_sent_month = $1 WHERE id IN (
       SELECT id FROM guide_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL AND last_sent_month IS DISTINCT FROM $1 ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED
     ) RETURNING id, email, country, locale, token`,
    [key, max],
  );
  let sent = 0;
  for (const [i, s] of batch.entries()) {
    // shortcut: pausa fixa para não passar do limite de envios por segundo do Resend; com milhares de inscritos, usar o envio em lote do Resend.
    if (i && pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    try {
      const { subject, html } = guideMonthlyEmail({ locale: resolveLocale(s.locale), country: s.country, month, appUrl, unsubscribeUrl: `${appUrl}/unsubscribe/${s.token}` });
      await mailer.send({
        to: s.email, subject, html, from: process.env.MAIL_MARKETING_FROM ?? "NewFarmer <novidades@newfarmer.app>",
        headers: { "List-Unsubscribe": `<${appUrl}/api/unsubscribe/${s.token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      sent++;
    } catch (error) {
      // Solta a reserva: o próximo cron tenta de novo.
      await db.run("UPDATE guide_subscribers SET last_sent_month = NULL WHERE id = $1", [s.id]);
      console.error("guia mensal: envio falhou", error);
    }
  }
  return { sent, failed: batch.length - sent };
}
