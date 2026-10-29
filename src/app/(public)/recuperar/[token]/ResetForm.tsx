"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { resetAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(resetAction, {});

  return (
    <AuthCard title={t("resetTitle")}>
      {state.done ? (
        <p role="status" className="rounded-xl bg-soft px-4 py-3">{t("resetDone")}</p>
      ) : (
        <form action={action} noValidate className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">{t("password")}</label>
            <input id="password" name="password" type="password" autoComplete="new-password"
              aria-describedby="password-error" className={inputClass} />
            <FieldError id="password-error" code={state.fieldErrors?.password} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold">{t("confirmPassword")}</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
              aria-describedby="confirmPassword-error" className={inputClass} />
            <FieldError id="confirmPassword-error" code={state.fieldErrors?.confirmPassword} />
          </div>
          {state.formError && (
            <p role="alert" className="text-sm text-danger">
              {tErrors(state.formError)} — <Link href="/recuperar" className="underline">{t("sendLink")}</Link>
            </p>
          )}
          <SubmitButton pending={pending}>{t("savePassword")}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("backToLogin")}</Link>
      </p>
    </AuthCard>
  );
}
