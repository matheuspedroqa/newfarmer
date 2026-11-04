"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Na tela de onboarding a barra de navegação some; o logo fica no topo. O layout não roda de novo na navegação interna, por isso a checagem é aqui. */
export function OnboardingLogo() {
  const pathname = usePathname();
  const t = useTranslations("app");
  if (!/^\/(welcome|subscribe)(\/|$)/.test(pathname)) return null;
  return (
    <Link href="/subscribe" className="inline-flex min-h-11 items-center gap-2 font-display text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span aria-hidden>🌾</span> {t("name")}
    </Link>
  );
}
