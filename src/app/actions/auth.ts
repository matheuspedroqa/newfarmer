"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import {
  forgotSchema,
  loginSchema,
  parseCityField,
  resetSchema,
  usernameReminderSchema,
  signupSchema,
  toFieldErrors,
} from "@/lib/validation";
import { getUserById, verifyCredentials } from "@/server/accounts";
import { logLoginAttempt, loginTarget, logSafely } from "@/server/activity-log";
import { signUpLogged } from "@/server/audited";
import { endSession, getCurrentUser, startSession } from "@/server/current-user";
import { getDb } from "@/server/db";
import { sendVerificationEmail } from "@/server/email-verification";
import { getMailer } from "@/server/mailer";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";
import { limitByIp } from "@/server/rate-limit";
import { sendUsernameReminder } from "@/server/username-reminder";
import { clientIp } from "@/server/request-context";
import { setPreferences } from "@/server/preferences";
import { refreshEstimatedClimate } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";

export type FormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  done?: boolean;
  /** Sem internet: ficou na fila do aparelho (src/lib/outbox.ts). */
  queued?: boolean;
  values?: Record<string, string>;
};

const baseUrl = () => process.env.APP_URL ?? "http://localhost:3000";

function typed(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "name", "email", "username", "terms", "age");
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: parseCityField(formData.get("city")),
    terms: formData.get("terms"),
    age: formData.get("age"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "signup", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "signup" }, ip });
    return { formError: "rateLimited", values };
  }
  const result = await signUpLogged(db, getWeatherProvider(), parsed.data, ip);
  if (!result.ok) return { fieldErrors: { [result.error === "emailTaken" ? "email" : "username"]: result.error }, values };

  const locale = resolveLocale(await getLocale());
  await setPreferences(db, result.userId, { locale });
  await startSession((await getUserById(db, result.userId))!);
  // Falha no envio não impede o cadastro: a faixa do topo deixa reenviar depois.
  try {
    await sendVerificationEmail(db, getMailer(db), { userId: result.userId, baseUrl: baseUrl(), locale });
  } catch (error) {
    console.error("Falha ao enviar e-mail de confirmação", error);
  }
  redirect("/welcome");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "username");
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "login", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "login" }, ip });
    return { formError: "rateLimited", values };
  }
  const result = await verifyCredentials(db, parsed.data.username, parsed.data.password);
  await logLoginAttempt(db, parsed.data.username, result, ip);
  if (!result.ok && result.reason === "locked") {
    await logSafely(db, { userId: null, action: "security.rateLimited", target: loginTarget(parsed.data.username), details: { limit: "loginLock" }, ip });
  }
  if (!result.ok) return { formError: result.reason === "locked" ? "locked" : "invalidCredentials", values };

  await refreshEstimatedClimate(db, getWeatherProvider(), result.userId).catch(() => undefined);
  await startSession((await getUserById(db, result.userId))!);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await logSafely(await getDb(), { userId: user.id, action: "auth.logout", target: user.username, ip: await clientIp() });
  await endSession();
  redirect("/login");
}

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "identifier");
  const parsed = forgotSchema.safeParse({ identifier: formData.get("identifier") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "recovery", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "recovery" }, ip });
    return { formError: "rateLimited", values };
  }
  try {
    await requestPasswordReset(db, getMailer(db), {
      identifier: parsed.data.identifier,
      baseUrl: baseUrl(),
      locale: resolveLocale(await getLocale()),
      ip,
    });
  } catch (error) {
    console.error("Falha ao enviar e-mail de recuperação", error);
    return { formError: "generic", values };
  }
  return { done: true };
}

export async function usernameReminderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "email");
  const parsed = usernameReminderSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "recovery", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "recovery" }, ip });
    return { formError: "rateLimited", values };
  }
  try {
    await sendUsernameReminder(db, getMailer(db), {
      email: parsed.data.email,
      baseUrl: baseUrl(),
      locale: resolveLocale(await getLocale()),
      ip,
    });
  } catch (error) {
    console.error("Falha ao enviar lembrete de username", error);
    return { formError: "generic", values };
  }
  return { done: true };
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const db = await getDb();
  const result = await resetPassword(db, { ...parsed.data, ip: await clientIp() });
  return result === "ok" ? { done: true } : { formError: "linkExpired" };
}
