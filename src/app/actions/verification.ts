"use server";

import { getLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { appUrl } from "@/server/app-url";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { sendVerificationEmail } from "@/server/email-verification";
import { getMailer } from "@/server/mailer";

export type ResendState = { result?: "sent" | "tooSoon" | "failed" };

export async function resendVerificationAction(): Promise<ResendState> {
  const user = await requireUser();
  const db = await getDb();
  try {
    const result = await sendVerificationEmail(db, getMailer(db), {
      userId: user.id,
      baseUrl: appUrl(),
      locale: resolveLocale(await getLocale()),
    });
    return { result: result === "tooSoon" ? "tooSoon" : "sent" };
  } catch (error) {
    console.error("Falha ao reenviar e-mail de confirmação", error);
    return { result: "failed" };
  }
}
