"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { previewCampaignAction, sendCampaignAction, type CampaignState } from "@/app/actions/admin";

// Os mesmos valores de AUDIENCES e MARKETING_TEMPLATES (server-only); o servidor valida de novo.
const TEMPLATES = ["weMissYou", "announcement"] as const;
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 font-normal";
const button = "min-h-11 rounded-full px-5 py-2 font-semibold disabled:cursor-wait disabled:opacity-60";

export function CampaignForm({ counts }: { counts: Record<string, number> }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const audiences = Object.keys(counts);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>("weMissYou");
  const [audience, setAudience] = useState(audiences[0]);
  const [preview, previewAction, previewing] = useActionState<CampaignState, FormData>(previewCampaignAction, {});
  const [send, sendAction, sending] = useActionState<CampaignState, FormData>(sendCampaignAction, {});
  // Com a campanha criada e ainda faltando gente, o formulário trava: só vale o id.
  const started = !!send.campaignId && (send.error ? true : (send.remaining ?? 0) > 0);
  const error = send.error ?? preview.error;

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
              <input name="subject" required maxLength={120} className={field} />
            </label>
            <label className="block text-sm font-semibold">
              {t("body")}
              <textarea name="body" required maxLength={5000} rows={6} className={field} />
            </label>
          </>
        )}
      </fieldset>
      {started && <input type="hidden" name="campaignId" value={send.campaignId} />}

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error === "sendFailed" || error === "invalidCampaign" ? t(error) : te(error)}</p>}
      {send.sent !== undefined && (
        <p role="status" data-testid="send-result" className="text-sm font-semibold text-primary">
          {send.remaining ? t("sendResult", { sent: send.sent, remaining: send.remaining }) : t("sendDone", { sent: send.sent })}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!started && (
          <button type="submit" formAction={previewAction} disabled={previewing} className={`${button} border border-border`}>{t("preview")}</button>
        )}
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
