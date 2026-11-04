"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/server/app-url";
import { logWriteLimited } from "@/server/activity-log";
import { getDb } from "@/server/db";
import { requirePlatformAdmin } from "@/server/authz";
import { getMailer } from "@/server/mailer";
import { AUDIENCES, sendOrCreateCampaign } from "@/server/marketing";
import { MARKETING_TEMPLATES, renderMarketingEmail } from "@/server/marketing-templates";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { resolveLocale } from "@/i18n/locales";
import { getLocale } from "next-intl/server";

export type CampaignState = { error?: string; html?: string; campaignId?: number; sent?: number; remaining?: number };

const campaignSchema = z.object({
  template: z.enum(MARKETING_TEMPLATES),
  audience: z.enum(AUDIENCES),
  subject: z.string().trim().max(120),
  body: z.string().trim().max(5000),
}).refine((v) => v.template === "weMissYou" || (v.subject.length > 0 && v.body.length > 0));

// weMissYou ignora assunto e texto.
const parse = (f: FormData) => {
  const r = campaignSchema.safeParse({ template: f.get("template"), audience: f.get("audience"), subject: f.get("subject") ?? "", body: f.get("body") ?? "" });
  return r.success ? { ok: true as const, data: r.data.template === "weMissYou" ? { ...r.data, subject: "", body: "" } : r.data } : { ok: false as const };
};

/** HTML do e-mail para um destinatário de exemplo (o próprio dono); não cria token nem campanha. */
async function preview(formData: FormData): Promise<CampaignState> {
  const admin = await requirePlatformAdmin();
  const db = await getDb();
  const limit = await limitWrites(db, admin.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, admin.id, admin.username, await clientIp());
    return { error: "rateLimited" };
  }
  const parsed = parse(formData);
  if (!parsed.ok) return { error: "required" };
  const url = appUrl();
  const { html } = renderMarketingEmail({
    template: parsed.data.template,
    locale: resolveLocale(await getLocale()),
    name: admin.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
    unsubscribeUrl: `${url}/unsubscribe/preview`,
    appUrl: url,
  });
  return { html };
}

/** Cria a campanha na primeira vez; com campaignId só continua o envio (nunca cria outra). sendCampaign já registra marketing.campaignSent. */
async function send(formData: FormData): Promise<CampaignState> {
  const admin = await requirePlatformAdmin();
  const db = await getDb();
  const raw = String(formData.get("campaignId") ?? "");
  const held = raw ? Number(raw) : null;
  // Todo retorno de erro repete o id enviado: o formulário nunca perde a campanha em andamento.
  const echo = held !== null && Number.isSafeInteger(held) ? { campaignId: held } : {};
  const limit = await limitWrites(db, admin.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, admin.id, admin.username, await clientIp());
    return { error: "rateLimited", ...echo };
  }
  const parsed = held === null ? parse(formData) : null;
  if (parsed && !parsed.ok) return { error: "required" };
  try {
    const r = await sendOrCreateCampaign(db, getMailer(db), {
      campaignId: held,
      campaign: parsed?.ok ? parsed.data : undefined,
      createdBy: admin.id,
      appUrl: appUrl(),
    });
    if ("error" in r) return { error: r.error, ...("campaignId" in r ? { campaignId: r.campaignId } : echo) };
    revalidatePath("/admin/emails");
    return r;
  } catch {
    return { error: "sendFailed", ...echo };
  }
}

// Nenhuma falha pode virar exceção: a React desmonta o formulário e a campanha em andamento se perderia (e o próximo "Enviar" criaria outra).
// notFound/redirect (dono do site, sessão) continuam passando.
const echoId = (f: FormData) => {
  const n = Number(f.get("campaignId"));
  return Number.isSafeInteger(n) && n > 0 ? { campaignId: n } : {};
};

export async function previewCampaignAction(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  try {
    return await preview(formData);
  } catch (error) {
    unstable_rethrow(error);
    return { error: "previewFailed" };
  }
}

export async function sendCampaignAction(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  try {
    return await send(formData);
  } catch (error) {
    unstable_rethrow(error);
    return { error: "sendFailed", ...echoId(formData) };
  }
}
