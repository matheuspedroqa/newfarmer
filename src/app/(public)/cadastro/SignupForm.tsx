"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { CityPicker } from "@/components/CityPicker";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function SignupForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <AuthCard title={t("signupTitle")}>
      <form action={action} noValidate className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-semibold">{t("name")}</label>
          <input id="name" name="name" autoComplete="name" defaultValue={state.values?.name} key={`n-${state.values?.name}`}
            aria-describedby="name-error" className={inputClass} />
          <FieldError id="name-error" code={errors.name} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">{t("email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email}
            key={`e-${state.values?.email}`} aria-describedby="email-error" className={inputClass} />
          <FieldError id="email-error" code={errors.email} />
          {errors.email === "emailTaken" && (
            <Link href="/login" className="text-sm text-primary hover:underline">{t("login")}</Link>
          )}
        </div>
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-semibold">{t("username")}</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            defaultValue={state.values?.username} key={`u-${state.values?.username}`}
            aria-describedby="username-help username-error" className={inputClass} />
          <p id="username-help" className="mt-1 text-sm text-muted">{t("usernameHelp")}</p>
          <FieldError id="username-error" code={errors.username} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">{t("password")}</label>
          <input id="password" name="password" type="password" autoComplete="new-password"
            aria-describedby="password-error" className={inputClass} />
          <FieldError id="password-error" code={errors.password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold">{t("confirmPassword")}</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
            aria-describedby="confirmPassword-error" className={inputClass} />
          <FieldError id="confirmPassword-error" code={errors.confirmPassword} />
        </div>
        <CityPicker error={errors.city} />
        {state.formError && <p role="alert" className="text-sm text-danger">{tErrors(state.formError)}</p>}
        <SubmitButton pending={pending}>{t("createAccount")}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">{t("haveAccount")}</Link>
      </p>
    </AuthCard>
  );
}
