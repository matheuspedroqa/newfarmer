"use client";

import { useTranslations } from "next-intl";
import { CONSENT_COOKIE, VISITOR_COOKIE } from "@/lib/cookies";

/** Reabre o aviso: apagar a escolha e recarregar basta. */
export function CookiePreferencesLink({ className }: { className?: string }) {
  const t = useTranslations("cookieNotice");
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        for (const c of [CONSENT_COOKIE, VISITOR_COOKIE, "nf_cookie_notice"]) document.cookie = `${c}=; path=/; max-age=0`;
        location.reload();
      }}
    >
      {t("preferences")}
    </button>
  );
}
