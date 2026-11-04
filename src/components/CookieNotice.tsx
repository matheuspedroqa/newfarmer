"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { COOKIE_NOTICE_COOKIE } from "@/lib/cookies";

export function CookieNotice() {
  const t = useTranslations("cookieNotice");
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function accept() {
    document.cookie = `${COOKIE_NOTICE_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
  }

  const card = (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-text shadow-lg ring-1 ring-border">
      <p className="text-sm">
        {t("text")}{" "}
        <Link href="/privacidade" className="underline">
          {t("privacy")}
        </Link>
      </p>
      <button type="button" onClick={accept} className="min-h-11 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-text md:min-h-0">
        {t("ok")}
      </button>
    </div>
  );

  return (
    <>
      {/* Cópia invisível no fim da página: reserva a altura do aviso para ele nunca cobrir o último botão. */}
      <div aria-hidden className="invisible p-4">{card}</div>
      {/* Na área logada do celular, o aviso fica acima da barra de navegação de baixo para não cobri-la. */}
      <div role="region" aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-50 p-4 max-md:[body:has([data-bottom-nav])_&]:bottom-[calc(4rem+env(safe-area-inset-bottom))]">
        {card}
      </div>
    </>
  );
}
