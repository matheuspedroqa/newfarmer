import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/app/actions/auth";
import { NavRail } from "@/components/NavRail";
import { TopControls } from "@/components/TopControls";
import { UserMenu } from "@/components/UserMenu";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { requireUser } from "@/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations();

  // Trilho de ícones da variante D. MyFarm e Perfil ficam no menu da conta.
  const nav = [
    { href: "/painel", icon: "📊", label: t("nav.dashboard") },
    { href: "/animais", icon: "🐔", label: t("nav.animals") },
    { href: "/plantacoes", icon: "🌱", label: t("nav.crops") },
    { href: "/clima", icon: "☀️", label: t("nav.weather") },
  ];

  return (
    <div className="flex min-h-screen">
      <NavRail items={nav} label={t("app.name")} />
      <div className="flex-1 p-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted" data-testid="user-climate">
              {user.cityLabel} · {t(`climate.${user.climateZone}`)}
              {user.climateEstimated && ` (${t("climate.estimated")})`} · {t(`climate.${user.hemisphere}`)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TopControls />
            <UserMenu name={user.name} isPlatformAdmin={user.isPlatformAdmin} />
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-border px-3 py-1 text-sm">{t("auth.logout")}</button>
            </form>
          </div>
        </header>
        {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
