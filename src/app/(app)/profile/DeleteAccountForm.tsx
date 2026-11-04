"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { deleteAccountAction } from "@/app/actions/profile";
import { FieldError } from "@/components/FieldError";

export function DeleteAccountForm() {
  const t = useTranslations("profile");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccountAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="max-w-md space-y-4">
      <div>
        <label htmlFor="delete-password" className="mb-1 block text-sm font-semibold">
          {t("deletePassword")}
        </label>
        <input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-describedby="delete-password-error"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3"
        />
        <FieldError id="delete-password-error" code={errors.password} />
      </div>
      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input name="confirm" type="checkbox" aria-describedby="delete-confirm-error" className="mt-1 size-5 shrink-0" />
          <span>{t("deleteConfirm")}</span>
        </label>
        <FieldError id="delete-confirm-error" code={errors.confirm} />
      </div>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl border-2 border-danger px-5 py-3 font-bold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:opacity-60 sm:w-60"
      >
        {t("deleteButton")}
      </button>
    </form>
  );
}
