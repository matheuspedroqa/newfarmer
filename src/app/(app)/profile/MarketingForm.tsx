"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { saveMarketingAction } from "@/app/actions/profile";
import { SubmitButton } from "@/components/SubmitButton";

export function MarketingForm({ current }: { current: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<FormState, FormData>(saveMarketingAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="marketing" defaultChecked={current} className="size-4" />
        {t("profile.marketingLabel")}
      </label>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{t(`errors.${state.formError}`)}</p>}
      {state.done && <p role="status" className="text-sm font-semibold text-primary">{t("profile.marketingSaved")}</p>}
      <div className="w-full sm:w-60">
        <SubmitButton pending={pending}>{t("profile.saveMarketing")}</SubmitButton>
      </div>
    </form>
  );
}
