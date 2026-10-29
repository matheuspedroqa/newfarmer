"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <form action={action} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">{t("email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" aria-describedby="email-error"
            defaultValue={state.values?.email} key={state.values?.email} className={inputClass} />
          <FieldError id="email-error" code={state.fieldErrors?.email} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">{t("password")}</label>
          <input id="password" name="password" type="password" autoComplete="current-password"
            aria-describedby="password-error" className={inputClass} />
          <FieldError id="password-error" code={state.fieldErrors?.password} />
        </div>
        {state.formError && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>
        )}
        <SubmitButton pending={pending}>{t("login")}</SubmitButton>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/recuperar" className="text-accent hover:underline">{t("forgot")}</Link>
        <Link href="/cadastro" className="font-bold text-primary hover:underline">{t("createAccount")}</Link>
      </div>
    </AuthCard>
  );
}
