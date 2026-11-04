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
            <label htmlFor="identifier" className="mb-1 block text-sm font-semibold">{t("identifier")}</label>
            <input id="identifier" name="identifier" type="text" autoComplete="username" defaultValue={state.values?.identifier}
              key={state.values?.identifier} aria-describedby="identifier-error"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3" />
            <FieldError id="identifier-error" code={state.fieldErrors?.identifier} />
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
