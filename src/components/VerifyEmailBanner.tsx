"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resendVerificationAction, type ResendState } from "@/app/actions/verification";

export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("verifyBanner");
  const [state, action, pending] = useActionState<ResendState>(resendVerificationAction, {});

  return (
    <div data-testid="verify-banner" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft px-5 py-3 ring-1 ring-accent/40">
      <p>
        ✉️ {t("text", { email })}
        {state.result && <span role="status" className="ml-2 font-semibold">{t(state.result)}</span>}
      </p>
      <form action={action}>
        <button type="submit" disabled={pending} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-text disabled:opacity-60">
          {t("resend")}
        </button>
      </form>
    </div>
  );
}
