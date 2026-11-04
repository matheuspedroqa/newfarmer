"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { CONSENT_COOKIE } from "@/lib/cookies";

export function CookieNotice() {
  const t = useTranslations("cookieNotice");
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function choose(value: "all" | "essential") {
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
    // O PageTracker só olha o cookie quando a rota muda: recarregar aplica a escolha já na página atual.
    location.reload();
  }
  const btn = "min-h-11 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-text md:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2";

  const card = (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-text shadow-lg ring-1 ring-border">
      <p className="text-sm">
        {t("text")}{" "}
        <Link href="/privacy" className="underline">
          {t("privacy")}
        </Link>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => choose("all")} className={btn}>{t("acceptAll")}</button>
        <button type="button" onClick={() => choose("essential")} className={btn}>{t("essentialOnly")}</button>
      </div>
    </div>
  );

  return (
    <>
      {/* Cópia invisível no fim da página: reserva a altura do aviso para ele nunca cobrir o último botão. */}
      <div aria-hidden className="invisible p-4">{card}</div>
      {/* Na área logada do celular, o aviso fica acima da barra de navegação de baixo para não cobri-la. */}
      <div role="region" aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-md:[body:has([data-bottom-nav])_&]:bottom-[calc(4rem+env(safe-area-inset-bottom))]">
        {card}
      </div>
    </>
  );
}
