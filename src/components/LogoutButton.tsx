"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/actions/auth";
import { forgetDevice, readOutbox } from "@/lib/outbox";

export function LogoutButton() {
  const t = useTranslations();
  return (
    <form
      action={logoutAction}
      onSubmit={(e) => {
        if (readOutbox().length && !window.confirm(t("offline.logoutConfirm"))) return e.preventDefault();
        forgetDevice();
      }}
    >
      <button type="submit" className="min-h-11 rounded-full border border-border px-3 py-1 text-sm md:min-h-0 transition-colors duration-150 hover:border-primary hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none">{t("auth.logout")}</button>
    </form>
  );
}
