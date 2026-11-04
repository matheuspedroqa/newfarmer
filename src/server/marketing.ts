import "server-only";
import { randomBytes } from "node:crypto";
import { resolveLocale, type Locale } from "@/i18n/locales";
import { logSafely } from "./activity-log";
import type { Db } from "./db";
import type { Mailer } from "./mailer";
import { renderMarketingEmail, type MarketingTemplate } from "./marketing-templates";

export const AUDIENCES = ["churned", "active", "neverSubscribed", "all"] as const;
export type Audience = (typeof AUDIENCES)[number];

// Textos fixos: nenhum valor do usuário entra no SQL.
const FILTER: Record<Audience, string> = {
  churned: "s.status = 'canceled'",
  active: "s.status IN ('active', 'trialing', 'past_due')",
  neverSubscribed: "(s.user_id IS NULL OR s.status IN ('none', 'incomplete', 'incomplete_expired'))",
  all: "TRUE",
};

export interface AudienceUser {
  id: number;
  name: string;
  email: string;
  locale: Locale;
}

const SELECT = `SELECT u.id, u.name, u.email, u.locale FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
  WHERE u.marketing_opt_in = TRUE AND u.is_platform_admin = FALSE AND `;

const toUser = (r: { id: number; name: string; email: string; locale: string }): AudienceUser => ({ ...r, locale: resolveLocale(r.locale) });

export async function listAudience(db: Db, audience: Audience): Promise<AudienceUser[]> {
  const rows = await db.query<{ id: number; name: string; email: string; locale: string }>(SELECT + FILTER[audience] + " ORDER BY u.id");
  return rows.map(toUser);
}

export async function unsubscribeUrl(db: Db, userId: number, appUrl: string): Promise<string> {
  // COALESCE: duas chamadas ao mesmo tempo acabam com o mesmo token.
  const [row] = await db.query<{ unsubscribe_token: string }>(
    "UPDATE users SET unsubscribe_token = COALESCE(unsubscribe_token, $2) WHERE id = $1 RETURNING unsubscribe_token",
    [userId, randomBytes(32).toString("base64url")],
  );
  return `${appUrl}/unsubscribe/${row.unsubscribe_token}`;
}

export async function unsubscribeByToken(db: Db, token: string, ip = ""): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const [row] = await db.query<{ id: number }>(
    "UPDATE users SET marketing_opt_in = FALSE WHERE unsubscribe_token = $1 RETURNING id",
    [token],
  );
  if (!row) return false;
  await logSafely(db, { userId: row.id, action: "marketing.optInChanged", details: { value: false, via: "unsubscribe" }, ip });
  return true;
}

export async function sendCampaign(
  db: Db,
  mailer: Mailer,
  { campaignId, appUrl, max = 50 }: { campaignId: number; appUrl: string; max?: number },
): Promise<{ sent: number; remaining: number }> {
  const [c] = await db.query<{ template: MarketingTemplate; audience: Audience; subject: string; body: string }>(
    "SELECT template, audience, subject, body FROM email_campaigns WHERE id = $1",
    [campaignId],
  );
  if (!c || !(c.audience in FILTER)) throw new Error("Campanha não encontrada");
  const pending = (
    await db.query<{ id: number; name: string; email: string; locale: string }>(
      // FILTER é texto fixo do código (nunca entrada do usuário), por isso é concatenado.
      SELECT + FILTER[c.audience] + " AND NOT EXISTS (SELECT 1 FROM email_campaign_recipients r WHERE r.campaign_id = $1 AND r.user_id = u.id) ORDER BY u.id",
      [campaignId],
    )
  ).map(toUser);
  const from = process.env.MAIL_MARKETING_FROM;
  let sent = 0;
  for (const user of pending.slice(0, max)) {
    const url = await unsubscribeUrl(db, user.id, appUrl);
    const { subject, html } = renderMarketingEmail({ template: c.template, locale: user.locale, name: user.name, subject: c.subject, body: c.body, unsubscribeUrl: url, appUrl });
    await mailer.send({
      to: user.email,
      subject,
      html,
      ...(from && { from }),
      headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    // Grava só depois do envio: se falhar, a próxima chamada tenta de novo esta pessoa.
    await db.run("INSERT INTO email_campaign_recipients (campaign_id, user_id, sent_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [campaignId, user.id, Date.now()]);
    sent++;
  }
  if (sent) await logSafely(db, { userId: null, action: "marketing.campaignSent", target: String(campaignId), details: { sent }, ip: "" });
  return { sent, remaining: pending.length - sent };
}
