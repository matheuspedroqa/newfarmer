"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { contactAction } from "@/app/actions/contact";
import type { FormState } from "@/app/actions/auth";
import { FieldError } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

export function ContactForm() {
  const t = useTranslations("contact");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(contactAction, {});
  const field = "w-full rounded-xl border border-border bg-bg px-4 py-3";
  const v = state.values;

  if (state.done) return <p role="status" data-testid="contact-sent" className="rounded-xl bg-soft px-4 py-3 font-semibold">{t("sent")}</p>;
  return (
    <form action={action} noValidate className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-semibold">{t("name")}</label>
        <input id="contact-name" name="name" autoComplete="name" maxLength={80} defaultValue={v?.name} key={`n${v?.name}`} aria-describedby="name-error" className={field} />
        <FieldError id="name-error" code={state.fieldErrors?.name} />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-semibold">{t("email")}</label>
        <input id="contact-email" name="email" type="email" autoComplete="email" defaultValue={v?.email} key={`e${v?.email}`} aria-describedby="email-error" className={field} />
        <FieldError id="email-error" code={state.fieldErrors?.email} />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-semibold">{t("message")}</label>
        <textarea id="contact-message" name="message" rows={6} maxLength={5000} defaultValue={v?.message} key={`m${v?.message}`} aria-describedby="message-error" className={field} />
        <FieldError id="message-error" code={state.fieldErrors?.message} />
      </div>
      {/* Armadilha para robôs: escondida de quem enxerga e de leitores de tela. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
      <SubmitButton pending={pending}>{t("send")}</SubmitButton>
    </form>
  );
}
