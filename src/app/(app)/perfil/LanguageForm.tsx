"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { saveLanguageAction } from "@/app/actions/profile";
import { SubmitButton } from "@/components/SubmitButton";
import { LOCALES, type Locale } from "@/i18n/locales";

export function LanguageForm({ current }: { current: Locale }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<FormState, FormData>(saveLanguageAction, {});

  return (
    <form action={action} className="space-y-4">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="sr-only">{t("profile.languageTitle")}</legend>
        {LOCALES.map((locale) => (
          <label
            key={locale}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-border has-[:checked]:bg-soft has-[:checked]:ring-2 has-[:checked]:ring-primary"
          >
            <input type="radio" name="locale" value={locale} defaultChecked={locale === current} className="accent-primary" />
            {t(`languages.${locale}`)}
          </label>
        ))}
      </fieldset>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{t(`errors.${state.formError}`)}</p>}
      {state.done && <p role="status" className="text-sm font-semibold text-primary">{t("profile.languageSaved")}</p>}
      <div className="w-full sm:w-60">
        <SubmitButton pending={pending}>{t("profile.saveLanguage")}</SubmitButton>
      </div>
    </form>
  );
}
