import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { intlLocale, resolveLocale } from "@/i18n/locales";
import { requireUser, subscriptionOf } from "@/server/current-user";
import { isAccessStatus } from "@/server/subscriptions";
import { CancelForm } from "./CancelForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("cancel.title") };
}

export default async function CancelPage() {
  const user = await requireUser();
  // O dono vê a tela como prévia; confirmar não cancela nada (cancelSubscriptionAction recusa).
  const sub = user.isPlatformAdmin ? { currentPeriodEnd: Date.now() + 30 * 86_400_000 } : await subscriptionOf(user.id);
  // Só quem tem uma assinatura que ainda vai renovar chega aqui; o resto volta para a aba Assinatura.
  if (!user.isPlatformAdmin && !(sub && "status" in sub && sub.subscriptionId && isAccessStatus(sub.status) && !sub.cancelAtPeriodEnd)) redirect("/profile/subscription");
  const t = await getTranslations("cancel");
  const date = sub?.currentPeriodEnd ? new Intl.DateTimeFormat(intlLocale(resolveLocale(await getLocale())), { dateStyle: "long" }).format(sub.currentPeriodEnd) : null;

  return (
    <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
      <h2 className="font-display text-2xl font-bold">{t("title")}</h2>
      <p className="mt-2 text-muted">{t("intro")}</p>
      {date && <p className="mt-2 font-semibold">{t("keepAccess", { date })}</p>}
      <CancelForm />
    </div>
  );
}
