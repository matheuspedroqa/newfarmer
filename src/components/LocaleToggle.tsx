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
          className="px-3 py-1 text-sm font-semibold transition-colors duration-150 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary aria-pressed:bg-primary aria-pressed:text-primary-text aria-pressed:hover:bg-primary aria-pressed:focus-visible:ring-primary-text aria-pressed:hover:opacity-90 motion-reduce:transition-none"
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
