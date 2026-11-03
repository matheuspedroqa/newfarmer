import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { logSafely } from "@/server/activity-log";
import { getDb } from "@/server/db";
import { confirmEmail } from "@/server/email-verification";
import { clientIp } from "@/server/request-context";

export default async function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("confirmPage");
  const db = await getDb();
  const confirmed = await confirmEmail(db, token);
  const ok = confirmed !== "expired";
  // Registra cada abertura válida do link (ele pode ser aberto várias vezes até vencer).
  if (confirmed !== "expired") await logSafely(db, { userId: confirmed.userId, action: "auth.emailConfirmed", ip: await clientIp() });

  return (
    <AuthCard title={ok ? t("okTitle") : t("expiredTitle")}>
      <p role="status" className="rounded-xl bg-soft px-4 py-3">{ok ? t("okText") : t("expiredText")}</p>
      <p className="mt-6 text-center">
        <Link href="/painel" className="font-semibold text-primary hover:underline">{t("continue")}</Link>
      </p>
    </AuthCard>
  );
}
