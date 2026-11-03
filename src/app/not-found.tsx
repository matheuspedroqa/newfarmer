import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meta"))("notFound") };
}

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const user = await getCurrentUser().catch(() => null);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-8 text-center">
      <p className="text-7xl" aria-hidden>🌾</p>
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("text")}</p>
      <Link href={user ? "/painel" : "/"} className="rounded-full bg-primary px-6 py-2 font-semibold text-primary-text">
        {t("back")}
      </Link>
    </main>
  );
}
