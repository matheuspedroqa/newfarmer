import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { getDb } from "@/server/db";
import { confirmEmail } from "@/server/email-verification";

export default async function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("confirmPage");
  const ok = (await confirmEmail(await getDb(), token)) === "ok";

  return (
    <AuthCard title={ok ? t("okTitle") : t("expiredTitle")}>
      <p role="status" className="rounded-xl bg-soft px-4 py-3">{ok ? t("okText") : t("expiredText")}</p>
      <p className="mt-6 text-center">
        <Link href="/painel" className="font-semibold text-primary hover:underline">{t("continue")}</Link>
      </p>
    </AuthCard>
  );
}
