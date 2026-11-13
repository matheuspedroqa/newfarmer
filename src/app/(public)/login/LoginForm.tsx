"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";
import { forgetDevice } from "@/lib/outbox";

// Só o usuário fica guardado no aparelho; a senha fica por conta do gerenciador de senhas do navegador.
const SAVED_USER = "nf_saved_username";
const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function LoginForm({ accountDeleted = false }: { accountDeleted?: boolean }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!accountDeleted) return;
    forgetDevice();
    try {
      localStorage.removeItem(SAVED_USER);
    } catch {}
  }, [accountDeleted]);
  // Preenche o usuário guardado neste aparelho (localStorage pode estar bloqueado: aí só não preenche).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_USER);
      if (!saved || !userRef.current || userRef.current.value) return;
      userRef.current.value = saved;
      if (saveRef.current) saveRef.current.checked = true;
    } catch {}
  }, [state]);
  const rememberUser = (e: React.FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    try {
      if (data.get("saveUser")) localStorage.setItem(SAVED_USER, String(data.get("username") ?? "").trim());
      else localStorage.removeItem(SAVED_USER);
    } catch {}
  };
  // Senha preenchida pelo navegador deixa o cursor fora dos campos, e aí o Enter não envia: envia aqui.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const form = formRef.current;
      if (e.key !== "Enter" || e.defaultPrevented || !form || (document.activeElement && document.activeElement !== document.body)) return;
      e.preventDefault();
      form.requestSubmit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      {accountDeleted && <p role="status" className="mb-4 rounded-xl bg-soft px-4 py-3 font-semibold">{t("accountDeleted")}</p>}
      <form ref={formRef} action={action} onSubmit={rememberUser} noValidate className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-semibold">{t("username")}</label>
          <input ref={userRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
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
        <div className="space-y-1 text-sm">
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name="remember" defaultChecked={state.values?.remember === "on"} key={`r-${state.values?.remember}`} className="size-4" />
            <span>{t("remember")}</span>
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input ref={saveRef} type="checkbox" name="saveUser" aria-describedby="save-user-hint" defaultChecked={state.values?.saveUser === "on"} key={`s-${state.values?.saveUser}`} className="size-4" />
            <span>{t("saveUser")}</span>
          </label>
          <p id="save-user-hint" className="text-muted">{t("saveUserHint")}</p>
        </div>
        {state.formError && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>
        )}
        <SubmitButton pending={pending}>{t("login")}</SubmitButton>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <span className="flex gap-4">
          <Link href="/forgot-password" className="text-accent hover:underline">{t("forgot")}</Link>
          <Link href="/forgot-username" className="text-accent hover:underline">{t("forgotUsername")}</Link>
        </span>
        <Link href="/register" className="font-bold text-primary hover:underline">{t("createAccount")}</Link>
      </div>
    </AuthCard>
  );
}
