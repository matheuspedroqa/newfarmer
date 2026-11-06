"use server";

import { resolveLocale } from "@/i18n/locales";
import { KNOWLEDGE_COUNTRIES, type KnowledgeCountry } from "@/lib/countries";
import { guideSignupSchema, toFieldErrors } from "@/lib/validation";
import { logSafely } from "@/server/activity-log";
import { appUrl } from "@/server/app-url";
import { getDb } from "@/server/db";
import { subscribeToGuide } from "@/server/guide-newsletter";
import { getMailer } from "@/server/mailer";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";

/** Formulário da página "o que plantar": pede o e-mail mensal (só vale depois de confirmar pelo e-mail). */
export async function guideSignupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  if (formData.get("website")) return { done: true }; // armadilha para robôs
  const country = String(formData.get("country") ?? "") as KnowledgeCountry;
  if (!KNOWLEDGE_COUNTRIES.includes(country)) return { formError: "generic", values };
  const parsed = guideSignupSchema.safeParse({ email: values.email, consent: formData.get("consent") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "guide", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "guide" }, ip });
    return { formError: "rateLimited", values };
  }
  try {
    await subscribeToGuide(db, getMailer(db), { email: parsed.data.email, country, locale: resolveLocale(String(formData.get("lang"))), appUrl: appUrl() });
  } catch (error) {
    console.error("Falha ao pedir o calendário mensal", error);
    return { formError: "generic", values };
  }
  // Mesma resposta para e-mail novo e já confirmado: não revela quem está na lista.
  return { done: true };
}
