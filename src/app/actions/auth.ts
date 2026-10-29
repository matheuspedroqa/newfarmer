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
import { createDevInboxMailer } from "@/server/mailer";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";
import { setPreferences } from "@/server/preferences";
import { refreshEstimatedClimate, registerUser } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";

export type FormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  done?: boolean;
  values?: Record<string, string>;
};

function typed(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "name", "email");
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: parseCityField(formData.get("city")),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = getDb();
  const result = await registerUser(db, getWeatherProvider(), parsed.data);
  if (!result.ok) return { fieldErrors: { email: "emailTaken" }, values };

  setPreferences(db, result.userId, { locale: resolveLocale(await getLocale()) });
  await startSession(getUserById(db, result.userId)!);
  redirect("/painel");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = typed(formData, "email");
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const db = getDb();
  const result = await verifyCredentials(db, parsed.data.email, parsed.data.password);
  if (!result.ok) return { formError: result.reason === "locked" ? "locked" : "invalidCredentials", values };

  await refreshEstimatedClimate(db, getWeatherProvider(), result.userId).catch(() => undefined);
  await startSession(getUserById(db, result.userId)!);
  redirect("/painel");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: typed(formData, "email") };

  const db = getDb();
  await requestPasswordReset(db, createDevInboxMailer(db), {
    email: parsed.data.email,
    baseUrl: process.env.APP_URL ?? "http://localhost:3000",
    locale: resolveLocale(await getLocale()),
  });
  return { done: true };
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const result = await resetPassword(getDb(), parsed.data);
  return result === "ok" ? { done: true } : { formError: "linkExpired" };
}
