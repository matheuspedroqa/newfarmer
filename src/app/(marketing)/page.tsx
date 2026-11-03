import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/current-user";

export default async function HomePage() {
  // Queda do banco não derruba a página pública
  if (await getCurrentUser().catch(() => null)) redirect("/painel");
  const t = await getTranslations();
  const cards = [
    ["🐔", t("nav.animals"), t("home.animalsText")],
    ["🌱", t("nav.crops"), t("home.cropsText")],
    ["⛅", t("nav.weather"), t("home.weatherText")],
  ];
  return (
    <>
      <section className="relative overflow-hidden px-5 py-16 text-center md:px-8 md:py-32">
        <div aria-hidden className="absolute inset-0 bg-[url('/landscape.svg')] bg-cover bg-bottom dark:brightness-[.55]" />
        <div className="relative mx-auto max-w-2xl rounded-3xl bg-bg/80 p-6 md:p-10 backdrop-blur">
          <h1 className="font-display text-4xl font-bold md:text-5xl text-primary">{t("app.tagline")}</h1>
          <Link href="/cadastro" className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-text">
            {t("home.cta")}
          </Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 gap-6 px-5 py-16 md:px-8">
        {cards.map(([icon, title, text]) => (
          <div key={title} className="rounded-3xl bg-surface p-6 ring-1 ring-border">
            <span className="text-4xl" aria-hidden>{icon}</span>
            <h2 className="mt-3 font-display text-2xl font-bold">{title}</h2>
            <p className="mt-2 text-muted">{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
