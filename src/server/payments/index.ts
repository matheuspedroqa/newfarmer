import "server-only";
import type { Currency } from "@/lib/pricing";
import { createFakePaymentProvider } from "./fake";
import { createStripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

let provider: PaymentProvider | undefined;

/** O pagamento falso é só para desenvolvimento e testes; em produção a variável é ignorada. */
export function shouldUseFakePayments(env: Record<string, string | undefined> = process.env): boolean {
  return env.STRIPE_FAKE === "1" && env.NODE_ENV !== "production";
}

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  if (shouldUseFakePayments()) return (provider = createFakePaymentProvider());
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return (provider = createStripeProvider(key));
}

export function priceIdFor(currency: Currency): string {
  const id = process.env[`STRIPE_PRICE_${currency.toUpperCase()}`];
  if (!id) throw new Error(`STRIPE_PRICE_${currency.toUpperCase()} não configurada`);
  return id;
}
