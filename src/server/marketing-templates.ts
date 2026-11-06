import "server-only";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import pt from "../../messages/pt.json";
import type { Locale } from "@/i18n/locales";
import { escapeHtml, renderEmail } from "./email-templates";

export const MARKETING_TEMPLATES = ["weMissYou", "announcement"] as const;
export type MarketingTemplate = (typeof MARKETING_TEMPLATES)[number];

const TEXTS = { pt: pt.email, en: en.email, es: es.email };

export function renderMarketingEmail(p: {
  template: MarketingTemplate;
  locale: Locale;
  name: string;
  subject?: string;
  body?: string;
  unsubscribeUrl: string;
  appUrl: string;
}): { subject: string; html: string } {
  const t = TEXTS[p.locale];
  const footerHtml = `${escapeHtml(t.marketingFooter)} <a href="${escapeHtml(p.unsubscribeUrl)}" style="color:#3f6b3a;">${escapeHtml(t.unsubscribe)}</a>`;
  const common = { locale: p.locale, name: p.name, note: "", footerHtml };
  if (p.template === "weMissYou") {
    return {
      subject: t.weMissYouSubject,
      html: renderEmail({ ...common, title: t.weMissYouTitle, intro: t.weMissYouIntro, button: t.weMissYouButton, link: `${p.appUrl}/subscribe` }),
    };
  }
  const body = p.body ?? "";
  const subject = p.subject ?? "";
  return {
    subject,
    html: renderEmail({
      ...common,
      title: subject,
      intro: body,
      introHtml: escapeHtml(body).replace(/\r?\n/g, "<br>"),
      button: t.announcementButton,
      link: `${p.appUrl}/dashboard`,
    }),
  };
}
