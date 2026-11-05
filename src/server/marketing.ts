import "server-only";
import { randomBytes } from "node:crypto";
import { resolveLocale, type Locale } from "@/i18n/locales";
import { logSafely } from "./activity-log";
import { limitByIp } from "./rate-limit";
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
  const [row] = await db.query<{ id: number; was: boolean }>(
    "UPDATE users SET marketing_opt_in = FALSE WHERE unsubscribe_token = $1 RETURNING id, (SELECT marketing_opt_in FROM users WHERE unsubscribe_token = $1) AS was",
    [token],
  );
  if (!row) return false;
  if (row.was) await logSafely(db, { userId: row.id, action: "marketing.optInChanged", details: { value: false, via: "unsubscribe" }, ip });
  return true;
}

/** Token válido sempre descadastra (Gmail/Yahoo postam de poucos IPs); só tentativa inválida gasta o limite do IP. */
export async function unsubscribeAttempt(db: Db, token: string, ip: string) {
  if (await unsubscribeByToken(db, token, ip)) return { result: "ok" as const, firstBlock: false };
  const limit = await limitByIp(db, "unsubscribe", ip);
  return limit.ok ? { result: "invalid" as const, firstBlock: false } : { result: "limited" as const, firstBlock: limit.firstBlock };
}

/** Quantos do público ainda não receberam esta campanha. */
async function remainingFor(db: Db, audience: Audience, campaignId: number): Promise<number> {
  const [{ n }] = await db.query<{ n: number }>(
    SELECT.replace("SELECT u.id, u.name, u.email, u.locale", "SELECT COUNT(*)::int AS n") + FILTER[audience] + " AND NOT EXISTS (SELECT 1 FROM email_campaign_recipients r WHERE r.campaign_id = $1 AND r.user_id = u.id)",
    [campaignId],
  );
  return n;
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
  const from = process.env.MAIL_MARKETING_FROM ?? "NewFarmer <novidades@newfarmer.app>";
  let sent = 0;
  try {
    for (const user of pending.slice(0, max)) {
      // Reserva atômica (uma só instrução, vale com várias máquinas): só quem a insere envia, e só se ainda tem opt-in.
      const claimed = await db.query(
        `INSERT INTO email_campaign_recipients (campaign_id, user_id, sent_at)
         SELECT $1, id, $3 FROM users WHERE id = $2 AND marketing_opt_in = TRUE
         ON CONFLICT DO NOTHING RETURNING user_id`,
        [campaignId, user.id, Date.now()],
      );
      if (!claimed.length) continue;
      try {
        const url = await unsubscribeUrl(db, user.id, appUrl);
        const { subject, html } = renderMarketingEmail({ template: c.template, locale: user.locale, name: user.name, subject: c.subject, body: c.body, unsubscribeUrl: url, appUrl });
        await mailer.send({
          to: user.email,
          subject,
          html,
          from,
          headers: { "List-Unsubscribe": `<${appUrl}/api/unsubscribe/${url.split("/").pop()}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        });
      } catch (error) {
        // Falhou: solta a reserva para a próxima chamada tentar esta pessoa de novo.
        await db.run("DELETE FROM email_campaign_recipients WHERE campaign_id = $1 AND user_id = $2", [campaignId, user.id]);
        throw error;
      }
      sent++;
    }
  } finally {
    if (sent) await logSafely(db, { userId: null, action: "marketing.campaignSent", target: String(campaignId), details: { sent }, ip: "" });
  }
  const n = await remainingFor(db, c.audience, campaignId);
  return { sent, remaining: n };
}

export async function createCampaign(
  db: Db,
  c: { template: MarketingTemplate; audience: Audience; subject: string; body: string; createdBy: number },
): Promise<number> {
  const [row] = await db.query<{ id: number }>(
    "INSERT INTO email_campaigns (template, audience, subject, body, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [c.template, c.audience, c.subject, c.body, c.createdBy, Date.now()],
  );
  return row.id;
}

export async function listCampaigns(db: Db) {
  const rows = await db.query<{ id: number; template: MarketingTemplate; audience: Audience; subject: string; body: string; created_at: string; sent: number }>(
    `SELECT c.id, c.template, c.audience, c.subject, c.body, c.created_at, (SELECT COUNT(*)::int FROM email_campaign_recipients r WHERE r.campaign_id = c.id) AS sent
     FROM email_campaigns c ORDER BY c.id DESC`,
  );
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id, template: r.template, audience: r.audience, subject: r.subject, body: r.body, createdAt: Number(r.created_at), sent: r.sent,
      remaining: r.audience in FILTER ? await remainingFor(db, r.audience, r.id) : 0,
    })),
  );
}

export async function audienceCount(db: Db, audience: Audience): Promise<number> {
  const [{ n }] = await db.query<{ n: number }>(SELECT.replace("SELECT u.id, u.name, u.email, u.locale", "SELECT COUNT(*)::int AS n") + FILTER[audience]);
  return n;
}

export async function campaignExists(db: Db, id: number): Promise<boolean> {
  return (await db.query("SELECT 1 FROM email_campaigns WHERE id = $1", [id])).length > 0;
}

/** Com `campaignId` só continua aquela campanha (id que não existe é erro, nunca cria outra); sem ele cria a campanha e envia o primeiro lote. */
export async function sendOrCreateCampaign(
  db: Db,
  mailer: Mailer,
  p: { campaignId: number | null; campaign?: { template: MarketingTemplate; audience: Audience; subject: string; body: string }; createdBy: number; appUrl: string; max?: number },
): Promise<{ error: "invalidCampaign" | "required" } | { error: "sendFailed"; campaignId: number } | { campaignId: number; sent: number; remaining: number }> {
  let campaignId = p.campaignId;
  if (campaignId !== null) {
    if (!Number.isSafeInteger(campaignId) || !(await campaignExists(db, campaignId))) return { error: "invalidCampaign" };
  } else {
    if (!p.campaign) return { error: "required" };
    campaignId = await createCampaign(db, { ...p.campaign, createdBy: p.createdBy });
  }
  try {
    return { campaignId, ...(await sendCampaign(db, mailer, { campaignId, appUrl: p.appUrl, max: p.max ?? 50 })) };
  } catch {
    return { error: "sendFailed", campaignId }; // a campanha já existe: o formulário continua nela
  }
}
