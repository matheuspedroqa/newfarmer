import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { TopControls } from "@/components/TopControls";
import { getCurrentUser } from "@/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations();

  // Trilho de ícones da variante D. A Etapa 2 acrescenta MyFarm, Animais, Plantações e Clima.
  const nav = [{ href: "/painel", icon: "📊", label: t("nav.dashboard") }];

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-20 shrink-0 flex-col items-center gap-3 bg-rail py-6" aria-label={t("app.name")}>
        <p className="mb-6 text-2xl" aria-hidden>🌾</p>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft text-xl dark:bg-primary"
          >
            {item.icon}
          </Link>
        ))}
      </nav>
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
