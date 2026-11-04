"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { previewCampaignAction, sendCampaignAction, type CampaignState } from "@/app/actions/admin";

// Os mesmos valores de AUDIENCES e MARKETING_TEMPLATES (server-only); o servidor valida de novo.
const TEMPLATES = ["weMissYou", "announcement"] as const;
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const field = `mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 font-normal ${focus}`;
const button = `min-h-11 rounded-full px-5 py-2 font-semibold disabled:cursor-wait disabled:opacity-60 ${focus}`;

export type Resume = { id: number; template: (typeof TEMPLATES)[number]; audience: string; subject: string; body: string; remaining: number };

export function CampaignForm({ counts, resume }: { counts: Record<string, number>; resume?: Resume }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const audiences = Object.keys(counts);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>(resume?.template ?? "weMissYou");
  const [audience, setAudience] = useState(resume?.audience ?? audiences[0]);
  const [preview, previewAction, previewing] = useActionState<CampaignState, FormData>(previewCampaignAction, {});
  const [send, sendAction, sending] = useActionState<CampaignState, FormData>(sendCampaignAction, {});
  // O id da campanha em andamento fica guardado aqui: nenhum resultado (erro, falha de rede) solta o formulário; só "Nova campanha".
  const [held, setHeld] = useState<number | null>(resume?.id ?? null);
  const [total, setTotal] = useState(0);
  const [seen, setSeen] = useState(send);
  if (send !== seen) {
    setSeen(send);
    if (send.campaignId) setHeld(send.campaignId);
    if (send.sent) setTotal((n) => n + (send.sent ?? 0));
  }
  const [clearedSend, setClearedSend] = useState<CampaignState | null>(null);
  const [clearedPreview, setClearedPreview] = useState<CampaignState | null>(null);
  const started = held !== null;
  const finished = started && send.remaining === 0 && !send.error;
  const newCampaign = () => {
    setHeld(null);
    setTotal(0);
    setClearedSend(send);
    setClearedPreview(preview);
  };
  // Depois de "Nova campanha", erros de antes não voltam.
  const error = (send === clearedSend ? undefined : send.error) ?? (preview === clearedPreview ? undefined : preview.error);

  return (
    <form className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-border">
      <h2 className="font-display text-xl font-bold">{t("campaignTitle")}</h2>
      <fieldset disabled={started} className="space-y-4">
        <label className="block text-sm font-semibold">
          {t("template")}
          <select name="template" value={template} onChange={(e) => setTemplate(e.target.value as typeof template)} className={field}>
            {TEMPLATES.map((m) => <option key={m} value={m}>{t(`template_${m}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t("audience")}
          <select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className={field}>
            {audiences.map((a) => <option key={a} value={a}>{t("audienceOption", { label: t(`audience_${a}`), count: counts[a] })}</option>)}
          </select>
          <span className="block text-xs font-normal text-muted">{t("audienceHelp")}</span>
        </label>
        {template === "announcement" && (
          <>
            <label className="block text-sm font-semibold">
              {t("subject")}
              <input name="subject" required maxLength={120} defaultValue={resume?.subject} className={field} />
            </label>
            <label className="block text-sm font-semibold">
              {t("body")}
              <textarea name="body" required maxLength={5000} rows={6} defaultValue={resume?.body} className={field} />
            </label>
          </>
        )}
      </fieldset>
      {started && <input type="hidden" name="campaignId" value={held} />}

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{["sendFailed", "invalidCampaign", "previewFailed"].includes(error) ? t(error) : te(error)}</p>}
      {started && send.sent !== undefined && (
        <p role="status" data-testid="send-result" className="text-sm font-semibold text-primary">
          {finished ? t("campaignDone", { total }) : t("sendResult", { sent: send.sent, remaining: send.remaining ?? 0 })}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!started && (
          <button type="submit" formAction={previewAction} disabled={previewing} className={`${button} border border-border`}>{t("preview")}</button>
        )}
        {!finished && (
          <button
            type="submit"
            formAction={sendAction}
            disabled={sending}
            onClick={(e) => {
              if (!started && !window.confirm(t("confirmSend", { count: counts[audience] }))) e.preventDefault();
            }}
            className={`${button} bg-primary text-white`}
          >
            {started ? t("continueSend") : t("send")}
          </button>
        )}
        {started && (
          <button type="button" onClick={newCampaign} disabled={sending} className={`${button} border border-border`}>{t("newCampaign")}</button>
        )}
      </div>

      {preview.html && !started && (
        <div>
          <h3 className="mb-2 font-semibold">{t("previewTitle")}</h3>
          <iframe title={t("previewTitle")} sandbox="" srcDoc={preview.html} data-testid="email-preview" className="h-96 w-full rounded-xl border border-border bg-white" />
        </div>
      )}
    </form>
  );
}
