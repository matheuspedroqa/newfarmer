import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogoutButton } from "@/components/LogoutButton";
import { NavRail } from "@/components/NavRail";
import { OfflineSync } from "@/components/OfflineSync";
import { TopControls } from "@/components/TopControls";
import { UserMenu } from "@/components/UserMenu";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations();
  const farm = await getFarm(await getDb(), user.id);
  // Páginas guardadas no aparelho para abrir sem internet (cada animal com a ficha e o diário).
  const offlinePaths = [
    "/dashboard", "/animals", "/crops", "/weather", "/myfarm", "/profile",
    ...farm.animals.flatMap((a) => [`/animals/${a.id}`, `/animals/${a.id}?tab=diary`]),
    // shortcut: até 20 plantações, para não pesar no servidor; aumentar se alguém reclamar de faltar ficha offline.
    ...farm.crops.slice(0, 20).map((c) => `/crops/${c}`),
  ];

  // Trilho de ícones da variante D. MyFarm e Perfil ficam no menu da conta.
  const nav = [
    { href: "/dashboard", icon: "📊", label: t("nav.dashboard") },
    { href: "/animals", icon: "🐔", label: t("nav.animals") },
    { href: "/crops", icon: "🌱", label: t("nav.crops") },
    { href: "/weather", icon: "☀️", label: t("nav.weather") },
  ];

  return (
    <div className="flex min-h-screen">
      <NavRail items={nav} label={t("app.name")} />
      {/* No celular a barra de navegação fica fixa embaixo: o pb-24 impede que ela cubra o conteúdo. */}
      <div className="min-w-0 flex-1 px-4 pt-4 pb-24 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted" data-testid="user-climate">
              {user.cityLabel} · {t(`climate.${user.climateZone}`)}
              {user.climateEstimated && ` (${t("climate.estimated")})`} · {t(`climate.${user.hemisphere}`)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <TopControls />
            <UserMenu name={user.name} isPlatformAdmin={user.isPlatformAdmin} />
            <LogoutButton />
          </div>
        </header>
        {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        <OfflineSync owner={user.username} paths={offlinePaths} />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
