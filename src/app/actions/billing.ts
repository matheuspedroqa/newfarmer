"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import { cancelSchema, toFieldErrors } from "@/lib/validation";
import { currencyForCountry } from "@/lib/pricing";
import { appUrl } from "@/server/app-url";
import { logSafely, logWriteLimited } from "@/server/activity-log";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getPaymentProvider, priceIdFor, shouldUseFakePayments } from "@/server/payments";
import { limitWrites } from "@/server/rate-limit";
import { logRequestError } from "@/server/monitoring";
import { clientIp } from "@/server/request-context";
import { ensureCustomer, getSubscription, hasOpenSubscription, requestCancellation } from "@/server/subscriptions";
import type { FormState } from "./auth";

export async function startCheckoutAction(): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    redirect("/subscribe?error=rateLimited");
  }
  if (await hasOpenSubscription(db, user.id)) redirect("/dashboard");
  // Pausada pelo dono do site: uma nova assinatura cobraria em dobro quando ela voltar.
  if ((await getSubscription(db, user.id))?.status === "paused") redirect("/subscribe");
  const currency = currencyForCountry(user.countryCode);
  let url: string;
  try {
    const provider = getPaymentProvider();
    const customerId = await ensureCustomer(db, provider, user);
    url = await provider.createCheckout({
      customerId,
      priceId: shouldUseFakePayments() ? "fake_price" : priceIdFor(currency),
      userId: user.id,
      locale: resolveLocale(await getLocale()),
      successUrl: `${appUrl()}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl()}/subscribe`,
    });
  } catch (error) {
    // Stripe fora do ar ou variável faltando na Vercel: o motivo vai para Admin > Monitoramento e a pessoa vê um aviso.
    await logRequestError(db, "action:startCheckout", error instanceof Error ? error.message : String(error)).catch(() => undefined);
    redirect("/subscribe?error=checkout");
  }
  await logSafely(db, { userId: user.id, action: "billing.checkoutStarted", target: user.username, details: { currency }, ip });
  redirect(url);
}

/** Tela de cancelar: cancela no fim do período pago e guarda o motivo. */
export async function cancelSubscriptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { reason: String(formData.get("reason") ?? ""), details: String(formData.get("details") ?? "") };
  const parsed = cancelSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, ip);
    return { formError: "rateLimited", values };
  }
  let result: "ok" | "notCancelable";
  try {
    result = await requestCancellation(db, getPaymentProvider(), user.id, parsed.data);
  } catch (error) {
    await logRequestError(db, "action:cancelSubscription", error instanceof Error ? error.message : String(error)).catch(() => undefined);
    return { formError: "generic", values };
  }
  if (result === "ok") await logSafely(db, { userId: user.id, action: "billing.subscriptionChanged", target: user.username, details: { status: "cancelRequested", reason: parsed.data.reason }, ip });
  redirect("/profile/subscription");
}

export async function openPortalAction(): Promise<void> {
  const user = await requireUser();
  const sub = await getSubscription(await getDb(), user.id);
  if (!sub) redirect("/subscribe");
  redirect(await getPaymentProvider().createPortal({ customerId: sub.customerId, returnUrl: `${appUrl()}/profile/subscription` }));
}
