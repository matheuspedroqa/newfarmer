"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";
import { forgetDevice } from "@/lib/outbox";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function LoginForm({ accountDeleted = false }: { accountDeleted?: boolean }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  useEffect(() => {
    if (accountDeleted) forgetDevice();
  }, [accountDeleted]);

  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      {accountDeleted && <p role="status" className="mb-4 rounded-xl bg-soft px-4 py-3 font-semibold">{t("accountDeleted")}</p>}
      <form action={action} noValidate className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-semibold">{t("username")}</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            aria-describedby="username-error" defaultValue={state.values?.username} key={state.values?.username}
            className={inputClass} />
          <FieldError id="username-error" code={state.fieldErrors?.username} />
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
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <span className="flex gap-4">
          <Link href="/recuperar" className="text-accent hover:underline">{t("forgot")}</Link>
          <Link href="/recuperar/username" className="text-accent hover:underline">{t("forgotUsername")}</Link>
        </span>
        <Link href="/cadastro" className="font-bold text-primary hover:underline">{t("createAccount")}</Link>
      </div>
    </AuthCard>
  );
}
