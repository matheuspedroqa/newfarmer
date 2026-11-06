import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { resolveLocale } from "@/i18n/locales";
import { guidePath } from "@/lib/plant-guide";
import { getDb } from "@/server/db";
import { confirmGuide } from "@/server/guide-newsletter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.confirmGuide"), robots: { index: false, follow: false } };
}

export default async function ConfirmGuidePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const confirmed = await confirmGuide(await getDb(), token);
  // A resposta sai no idioma de quem pediu, mesmo abrindo o link num navegador em outra língua.
  const locale = confirmed ?? resolveLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "confirmGuide" });

  return (
    <AuthCard title={confirmed ? t("okTitle") : t("invalidTitle")}>
      <p role="status" className="rounded-xl bg-soft px-4 py-3">{confirmed ? t("okText") : t("invalidText")}</p>
      <p className="mt-6 text-center">
        <Link href={guidePath(locale)} className="font-semibold text-primary hover:underline">{t("back")}</Link>
      </p>
    </AuthCard>
  );
}
