"use server";

import { getLocale } from "next-intl/server";
import { contactSchema, toFieldErrors } from "@/lib/validation";
import { limitByIpLogged } from "@/server/activity-log";
import { sendContactMessage } from "@/server/contact";
import { getDb } from "@/server/db";
import { getMailer } from "@/server/mailer";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""), message: String(formData.get("message") ?? "") };
  // Campo escondido que só robô preenche: finge que enviou e não manda nada.
  if (formData.get("website")) return { done: true };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIpLogged(db, "contact", ip);
  if (!limit.ok) {
    return { formError: "rateLimited", values };
  }
  try {
    await sendContactMessage(getMailer(db), { ...parsed.data, locale: await getLocale() });
  } catch (error) {
    // Não deu para enviar: a pessoa vê o erro e o texto continua no formulário para tentar de novo.
    console.error("Falha ao enviar mensagem de contato", error);
    return { formError: "generic", values };
  }
  return { done: true };
}
