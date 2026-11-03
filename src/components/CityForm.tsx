"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { changeCityAction } from "@/app/actions/farm";
import { CityPicker } from "./CityPicker";
import { SubmitButton } from "./SubmitButton";

export function CityForm() {
  const t = useTranslations("myfarm");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(changeCityAction, {});
  return (
    <form action={action} noValidate className="mt-4 flex items-start gap-4">
      <div className="flex-1">
        <CityPicker error={state.fieldErrors?.city} />
      </div>
      <div className="mt-6 w-48">
        <SubmitButton pending={pending}>{t("saveCity")}</SubmitButton>
      </div>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
      {state.done && (
        <p role="status" className="mt-7 max-w-xs text-sm font-semibold text-primary">{t("cityChanged")}</p>
      )}
    </form>
  );
}
