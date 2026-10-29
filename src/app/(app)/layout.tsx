import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { NavRail } from "@/components/NavRail";
import { TopControls } from "@/components/TopControls";
import { getCurrentUser } from "@/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations();

  // Trilho de ícones da variante D. A Etapa 3 acrescenta Animais e Plantações.
  const nav = [
    { href: "/painel", icon: "📊", label: t("nav.dashboard") },
    { href: "/myfarm", icon: "🏡", label: t("nav.myfarm") },
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
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-border px-3 py-1 text-sm">{t("auth.logout")}</button>
            </form>
          </div>
        </header>
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
