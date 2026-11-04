import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { logSafely } from "@/server/activity-log";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { clientIp } from "@/server/request-context";
import { getSubscription, hasAccess, upsertSubscription } from "@/server/subscriptions";

export const dynamic = "force-dynamic";

export default async function SubscribeSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await requireUser();
  const db = await getDb();
  const sessionId = (await searchParams).session_id;
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
    await logSafely(db, { userId: user.id, action: "billing.subscriptionChanged", target: user.username, details: { status: checkout.subscription.status }, ip: await clientIp() });
  }
  if (hasAccess(user, await getSubscription(db, user.id))) redirect("/dashboard");
  const t = await getTranslations("subscribe");
  return (
    <section className="max-w-2xl">
      <meta httpEquiv="refresh" content="3" />
      <p role="status" className="text-lg">{t("processing")}</p>
    </section>
  );
}
