"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { currencyForCountry } from "@/lib/pricing";
import { appUrl } from "@/server/app-url";
import { logSafely, logWriteLimited } from "@/server/activity-log";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getPaymentProvider, priceIdFor, shouldUseFakePayments } from "@/server/payments";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { ensureCustomer, getSubscription, hasOpenSubscription } from "@/server/subscriptions";

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
  const provider = getPaymentProvider();
  const currency = currencyForCountry(user.countryCode);
  const customerId = await ensureCustomer(db, provider, user);
  const url = await provider.createCheckout({
    customerId,
    priceId: shouldUseFakePayments() ? "fake_price" : priceIdFor(currency),
    userId: user.id,
    locale: (await getLocale()) === "pt" ? "pt" : "en",
    successUrl: `${appUrl()}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl()}/subscribe`,
  });
  await logSafely(db, { userId: user.id, action: "billing.checkoutStarted", target: user.username, details: { currency }, ip });
  redirect(url);
}

export async function openPortalAction(): Promise<void> {
  const user = await requireUser();
  const sub = await getSubscription(await getDb(), user.id);
  if (!sub) redirect("/subscribe");
  redirect(await getPaymentProvider().createPortal({ customerId: sub.customerId, returnUrl: `${appUrl()}/profile` }));
}
