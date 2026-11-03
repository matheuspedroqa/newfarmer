"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import {
  forgotSchema,
  loginSchema,
  parseCityField,
  resetSchema,
  signupSchema,
  toFieldErrors,
} from "@/lib/validation";
import { getUserById, verifyCredentials } from "@/server/accounts";
import { endSession, startSession } from "@/server/current-user";
import { getDb } from "@/server/db";
import { sendVerificationEmail } from "@/server/email-verification";
import { getMailer } from "@/server/mailer";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { setPreferences } from "@/server/preferences";
import { refreshEstimatedClimate, registerUser } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";

export type FormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  done?: boolean;
  values?: Record<string, string>;
};

const baseUrl = () => process.env.APP_URL ?? "http://localhost:3000";

function typed(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "name", "email", "username");
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: parseCityField(formData.get("city")),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  if (!(await limitByIp(db, "signup", await clientIp())).ok) return { formError: "rateLimited", values };
  const result = await registerUser(db, getWeatherProvider(), parsed.data);
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
  redirect("/boas-vindas");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "username");
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = await getDb();
  if (!(await limitByIp(db, "login", await clientIp())).ok) return { formError: "rateLimited", values };
  const result = await verifyCredentials(db, parsed.data.username, parsed.data.password);
  if (!result.ok) return { formError: result.reason === "locked" ? "locked" : "invalidCredentials", values };

  await refreshEstimatedClimate(db, getWeatherProvider(), result.userId).catch(() => undefined);
  await startSession((await getUserById(db, result.userId))!);
  redirect("/painel");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: typed(formData, "email") };

  const db = await getDb();
  if (!(await limitByIp(db, "recovery", await clientIp())).ok) {
    return { formError: "rateLimited", values: typed(formData, "email") };
  }
  try {
    await requestPasswordReset(db, getMailer(db), {
      email: parsed.data.email,
      baseUrl: baseUrl(),
      locale: resolveLocale(await getLocale()),
    });
  } catch (error) {
    console.error("Falha ao enviar e-mail de recuperação", error);
    return { formError: "generic", values: typed(formData, "email") };
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

  const result = await resetPassword((await getDb()), parsed.data);
  return result === "ok" ? { done: true } : { formError: "linkExpired" };
}
