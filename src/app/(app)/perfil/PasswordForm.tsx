"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { changePasswordAction } from "@/app/actions/profile";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function PasswordForm() {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="max-w-md space-y-4">
      {(["currentPassword", "password", "confirmPassword"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={`pw-${field}`} className="mb-1 block text-sm font-semibold">
            {t(field === "password" ? "newPassword" : field)}
          </label>
          <input
            id={`pw-${field}`}
            name={field}
            type="password"
            autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
            aria-describedby={`pw-${field}-error`}
            className={inputClass}
          />
          <FieldError id={`pw-${field}-error`} code={errors[field]} />
        </div>
      ))}
      {state.done && <p role="status" className="rounded-xl bg-soft px-4 py-3 font-semibold">{t("passwordChanged")}</p>}
      <div className="w-60">
        <SubmitButton pending={pending}>{t("savePassword")}</SubmitButton>
      </div>
    </form>
  );
}
