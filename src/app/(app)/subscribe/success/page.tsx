import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logSafely } from "@/server/activity-log";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { clientIp } from "@/server/request-context";
import { getSubscription, hasAccess, upsertSubscription } from "@/server/subscriptions";

export const dynamic = "force-dynamic";
const MAX_TRIES = 5;

export default async function SubscribeSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; try?: string }> }) {
  const user = await requireUser();
  const db = await getDb();
  const { session_id: sessionId, try: tryParam } = await searchParams;
  const tries = Math.max(0, Math.min(MAX_TRIES, Number(tryParam) || 0));
  const own = await getSubscription(db, user.id);
  if (!sessionId || !own) redirect("/subscribe");
  let checkout;
  try {
    checkout = await getPaymentProvider().getCheckout(sessionId);
  } catch (error) {
    console.error("Falha ao ler a sessão de pagamento", error);
    redirect("/subscribe");
  }
  // Só vale a sessão do cliente desta conta: sem isso, a sessão de outra pessoa liberaria qualquer conta.
  if (checkout.customerId !== own.customerId) redirect("/subscribe");
  if (checkout.subscription) {
    await upsertSubscription(db, user.id, own.customerId, checkout.subscription);
    const now = await getSubscription(db, user.id);
    // Só registra quando algo mudou, para o recarregamento automático não encher o registro.
    if (now?.status !== own.status || now?.subscriptionId !== own.subscriptionId) {
      await logSafely(db, { userId: user.id, action: "billing.subscriptionChanged", target: user.username, details: { status: now?.status ?? "none" }, ip: await clientIp() });
    }
    if (hasAccess(user, now)) redirect("/dashboard");
  }
  const t = await getTranslations("subscribe");
  // Sem assinatura na sessão, ou depois de 5 tentativas: nada foi confirmado, não promete liberação.
  const waiting = checkout.subscription !== null && tries < MAX_TRIES;
  return (
    <section className="max-w-2xl">
      {waiting && <meta httpEquiv="refresh" content={`3;url=/subscribe/success?session_id=${encodeURIComponent(sessionId)}&try=${tries + 1}`} />}
      <h1 className="font-display text-4xl font-bold">{t("successTitle")}</h1>
      <p role="status" className="mt-4 text-lg">{waiting ? t("processing") : t("notReceived")}</p>
      {!waiting && <Link href="/subscribe" className="mt-4 inline-flex min-h-11 items-center text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("back")}</Link>}
    </section>
  );
}
