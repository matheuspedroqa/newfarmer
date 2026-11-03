import "server-only";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import type { Locale } from "@/i18n/locales";

const TEXTS = { pt: pt.email, en: en.email };

// Cores do tema claro do site (globals.css). E-mail não lê CSS externo: tudo vai inline, em tabelas,
// que é o que o Gmail e o Outlook mostram do mesmo jeito.
const C = { bg: "#f6f1e7", surface: "#ffffff", text: "#2e2a22", muted: "#6e675a", primary: "#3f6b3a", border: "#ddd3bf" };
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface EmailContent {
  locale: Locale;
  name: string;
  username?: string;
  title: string;
  intro: string;
  introHtml?: string;
  button: string;
  link: string;
  note: string;
}

function renderEmail({ locale, name, username, title, intro, introHtml, button, link, note }: EmailContent): string {
  const t = TEXTS[locale];
  const href = escapeHtml(link);
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;font-family:${FONT};">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.surface};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
    <tr><td style="background:${C.primary};padding:20px 32px;color:#ffffff;font-size:22px;font-weight:700;">🌱 NewFarmer</td></tr>
    <tr><td style="padding:32px;color:${C.text};font-size:16px;line-height:1.6;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${C.text};">${escapeHtml(title)}</h1>
      <p style="margin:0 0 12px;">${escapeHtml(t.greeting.replace("{name}", () => name))}</p>
      ${username ? `<p style="margin:0 0 12px;">${escapeHtml(t.verifyUsername.replace("{username}", () => username))}</p>
      ` : ""}<p style="margin:0 0 24px;">${introHtml ?? escapeHtml(intro)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${C.primary};border-radius:12px;">
          <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;text-decoration:none;font-size:16px;">${escapeHtml(button)}</a>
        </td>
      </tr></table>
      <p style="margin:24px 0 4px;font-size:13px;color:${C.muted};">${escapeHtml(t.linkFallback)}</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${href}" style="color:${C.primary};">${href}</a></p>
      <p style="margin:0;font-size:13px;color:${C.muted};">${escapeHtml(note)}</p>
    </td></tr>
    <tr><td style="border-top:1px solid ${C.border};padding:16px 32px;font-size:12px;color:${C.muted};">${escapeHtml(t.footer)}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function verifyEmail(locale: Locale, name: string, username: string, link: string) {
  const t = TEXTS[locale];
  return {
    subject: t.verifySubject,
    html: renderEmail({ locale, name, username, link, title: t.verifyTitle, intro: t.verifyIntro, button: t.verifyButton, note: t.verifyNote }),
  };
}

export function resetEmail(locale: Locale, name: string, link: string) {
  const t = TEXTS[locale];
  return {
    subject: t.resetSubject,
    html: renderEmail({ locale, name, link, title: t.resetTitle, intro: t.resetIntro, button: t.resetButton, note: t.resetNote }),
  };
}

export function usernameReminderEmail(locale: Locale, name: string, username: string, link: string) {
  const t = TEXTS[locale];
  const intro = t.usernameIntro.replace("{username}", () => username);
  // O username vai escapado e em destaque, dentro do próprio elemento.
  const introHtml = escapeHtml(t.usernameIntro).replace("{username}", () => `<strong>${escapeHtml(username)}</strong>`);
  return {
    subject: t.usernameSubject,
    html: renderEmail({ locale, name, link, title: t.usernameTitle, intro, introHtml, button: t.usernameButton, note: t.usernameNote }),
  };
}
