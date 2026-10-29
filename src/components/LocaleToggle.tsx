"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/preferences";
import { LOCALES, type Locale } from "@/i18n/locales";

export function LocaleToggle({ current }: { current: Locale }) {
  const t = useTranslations("toggles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-full border border-border">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setLocaleAction(locale);
              router.refresh();
            })
          }
          className="px-3 py-1 text-sm font-semibold aria-pressed:bg-primary aria-pressed:text-primary-text"
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
