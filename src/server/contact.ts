import "server-only";
import { escapeHtml } from "./email-templates";
import type { Mailer } from "./mailer";

/** Caixa que recebe o formulário de contato; CONTACT_EMAIL na Vercel troca sem mexer no código. */
export const contactInbox = () => process.env.CONTACT_EMAIL ?? "contact@newfarmer.app";

/** Manda a mensagem para a caixa do contato; "Responder" vai direto para quem escreveu. Nada fica guardado no banco. */
export async function sendContactMessage(mailer: Mailer, input: { name: string; email: string; message: string; locale: string }): Promise<void> {
  const text = escapeHtml(input.message).replaceAll("\n", "<br>");
  await mailer.send({
    to: contactInbox(),
    replyTo: input.email,
    subject: `Contato pelo site: ${input.name.replace(/[\r\n]+/g, " ")}`,
    html: `<p><b>Nome:</b> ${escapeHtml(input.name)}<br><b>E-mail:</b> ${escapeHtml(input.email)}<br><b>Idioma:</b> ${escapeHtml(input.locale)}</p><p>${text}</p>`,
  });
}
