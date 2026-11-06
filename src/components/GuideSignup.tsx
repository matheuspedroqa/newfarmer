"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { guideSignupAction } from "@/app/actions/guide";
import type { Locale } from "@/i18n/locales";
import { KNOWLEDGE_COUNTRIES, type KnowledgeCountry } from "@/lib/countries";
import { FieldError } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

export function GuideSignup({ country: pageCountry, lang }: { country: KnowledgeCountry; lang: Locale }) {
  const t = useTranslations("guide");
  const tCountries = useTranslations("countries");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(guideSignupAction, {});
  // Começa no país da página; o e-mail mensal vai pelo país escolhido aqui.
  const [country, setCountry] = useState(pageCountry);
  const select = useRef<HTMLSelectElement>(null);
  // O React limpa o formulário depois de cada envio e o select voltaria ao país da página: devolve o escolhido.
  useEffect(() => {
    if (select.current) select.current.value = country;
  }, [state, country]);
  const inCountry = t(`inCountry.${country}`);

  return (
    <section data-testid="guide-signup" className="mt-10 rounded-3xl bg-surface p-6 ring-1 ring-border md:p-8">
      <h2 className="font-display text-2xl font-bold">{t("signupTitle")}</h2>
      <p className="mt-2 text-muted">{t("signupText", { inCountry })}</p>
      {state.done ? (
        <p role="status" className="mt-4 rounded-xl bg-soft px-4 py-3 font-semibold">{t("signupSent")}</p>
      ) : (
        <form action={action} noValidate className="mt-4 space-y-4">
          <input type="hidden" name="lang" value={lang} />
          <div>
            <label htmlFor="guide-email" className="mb-1 block text-sm font-semibold">{t("signupEmail")}</label>
            <input id="guide-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} key={state.values?.email} aria-describedby="guide-email-error" className="w-full rounded-xl border border-border bg-bg px-4 py-3" />
            <FieldError id="guide-email-error" code={state.fieldErrors?.email} />
          </div>
          <div>
            <label htmlFor="guide-country" className="mb-1 block text-sm font-semibold">{t("signupCountry")}</label>
            <select ref={select} id="guide-country" name="country" value={country} onChange={(e) => setCountry(e.target.value as KnowledgeCountry)} className="min-h-11 w-full rounded-xl border border-border bg-bg px-4 py-3">
              {KNOWLEDGE_COUNTRIES.map((c) => (
                <option key={c} value={c}>{tCountries(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex min-h-11 items-start gap-3">
              <input type="checkbox" name="consent" aria-describedby="guide-consent-error" className="mt-1 size-5 shrink-0 accent-primary" />
              <span className="text-sm">{t("signupConsent", { inCountry })}</span>
            </label>
            <FieldError id="guide-consent-error" code={state.fieldErrors?.consent} />
          </div>
          {/* Armadilha para robôs: escondida de quem enxerga e de leitores de tela. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
          <SubmitButton pending={pending}>{t("signupButton")}</SubmitButton>
        </form>
      )}
    </section>
  );
}
