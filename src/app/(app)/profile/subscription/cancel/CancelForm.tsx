"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { cancelSubscriptionAction } from "@/app/actions/billing";
import type { FormState } from "@/app/actions/auth";
import { FieldError } from "@/components/FieldError";
import { CANCEL_REASONS } from "@/lib/validation";

export function CancelForm() {
  const t = useTranslations("cancel");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(cancelSubscriptionAction, {});
  const v = state.values;

  return (
    <form action={action} noValidate className="mt-6 space-y-5">
      <fieldset aria-describedby="reason-error">
        <legend className="mb-2 font-semibold">{t("reasonLabel")}</legend>
        <div className="space-y-1">
          {CANCEL_REASONS.map((r) => (
            <label key={r} className="flex min-h-11 items-center gap-3">
              <input type="radio" name="reason" value={r} defaultChecked={v?.reason === r} className="size-5 accent-primary" />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </div>
        <FieldError id="reason-error" code={state.fieldErrors?.reason} />
      </fieldset>
      <div>
        <label htmlFor="cancel-details" className="mb-1 block font-semibold">{t("detailsLabel")}</label>
        <p className="mb-2 text-sm text-muted">{t("detailsHelp")}</p>
        <textarea id="cancel-details" name="details" rows={4} maxLength={1000} defaultValue={v?.details} key={v?.details} aria-describedby="details-error" className="w-full rounded-xl border border-border bg-bg px-4 py-3" />
        <FieldError id="details-error" code={state.fieldErrors?.details} />
      </div>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-danger px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          {t("confirm")}
        </button>
        <Link href="/profile/subscription" className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-primary px-5 py-3 font-bold transition hover:bg-hover">
          {t("back")}
        </Link>
      </div>
    </form>
  );
}
