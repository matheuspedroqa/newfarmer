"use client";

import { useTranslations } from "next-intl";

export function FieldError({ code, id }: { code?: string; id: string }) {
  const t = useTranslations("errors");
  if (!code) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {t(code)}
    </p>
  );
}
