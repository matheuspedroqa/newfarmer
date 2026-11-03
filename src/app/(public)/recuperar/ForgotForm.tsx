"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

export function ForgotForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(forgotAction, {});

  return (
    <AuthCard title={t("forgotTitle")}>
      {state.done ? (
        <p role="status" className="rounded-xl bg-soft px-4 py-3">{t("forgotSent")}</p>
      ) : (
        <form action={action} noValidate className="space-y-4">
          <p className="text-sm text-muted">{t("forgotHelp")}</p>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">{t("email")}</label>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email}
              key={state.values?.email} aria-describedby="email-error"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3" />
            <FieldError id="email-error" code={state.fieldErrors?.email} />
          </div>
          {state.formError && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>
          )}
          <SubmitButton pending={pending}>{t("sendLink")}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("backToLogin")}</Link>
      </p>
    </AuthCard>
  );
}
