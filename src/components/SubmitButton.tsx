"use client";

import { useTranslations } from "next-intl";

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  const t = useTranslations("auth");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-primary py-3 font-bold text-primary-text shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? t("sending") : children}
    </button>
  );
}
