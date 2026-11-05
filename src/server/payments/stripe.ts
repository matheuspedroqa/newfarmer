import "server-only";
import type { PaymentProvider, StripeSubscription } from "./types";

// Resposta externa: lida campo a campo, com valores padrão.
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ms = (seconds: unknown) => (typeof seconds === "number" ? seconds * 1000 : null);
const idOf = (v: unknown) => String(typeof v === "object" && v ? (v as { id: unknown }).id : v);

/**
 * Objeto de assinatura da Stripe (webhook ou expand) -> nosso formato. Versões novas da API movem current_period_end para o item.
 * Pausa na Stripe é "active" com pause_collection; aqui vira o status "paused", que não dá acesso.
 */
export function parseStripeSubscription(raw: Raw): StripeSubscription {
  const item = raw.items?.data?.[0];
  return {
    id: String(raw.id),
    customer: idOf(raw.customer),
    status: raw.status === "active" && raw.pause_collection ? "paused" : String(raw.status),
    currency: String(item?.price?.currency ?? raw.currency ?? ""),
    amount: Number(item?.price?.unit_amount ?? 0),
    currentPeriodEnd: ms(raw.current_period_end ?? item?.current_period_end),
    cancelAtPeriodEnd: raw.cancel_at_period_end === true,
    canceledAt: ms(raw.canceled_at),
  };
}

export function createStripeProvider(secretKey: string, fetchFn: typeof fetch = fetch): PaymentProvider {
  async function call(method: "GET" | "POST" | "DELETE", path: string, form?: Record<string, string>, okStatus?: number): Promise<Raw> {
    const response = await fetchFn(`https://api.stripe.com/v1/${path}`, {
      method,
      headers: { Authorization: `Bearer ${secretKey}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    // Nunca copie o corpo do erro: pode ter e-mail e nome da pessoa.
    if (!response.ok && response.status !== okStatus) throw new Error(`Stripe respondeu ${response.status}`);
    return response.ok ? ((await response.json()) as Raw) : {};
  }

  return {
    async createCustomer({ email, name, userId }) {
      return String((await call("POST", "customers", { email, name, "metadata[user_id]": String(userId) })).id);
    },
    async createCheckout({ customerId, priceId, userId, locale, successUrl, cancelUrl }) {
      const r = await call("POST", "checkout/sessions", {
        mode: "subscription",
        customer: customerId,
        client_reference_id: String(userId),
        locale: locale === "pt" ? "pt-BR" : "en",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "subscription_data[metadata][user_id]": String(userId),
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return String(r.url);
    },
    async getCheckout(sessionId) {
      const r = await call("GET", `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`);
      const sub = r.subscription && typeof r.subscription === "object" ? parseStripeSubscription(r.subscription) : null;
      return { customerId: idOf(r.customer), subscription: sub };
    },
    async createPortal({ customerId, returnUrl }) {
      return String((await call("POST", "billing_portal/sessions", { customer: customerId, return_url: returnUrl })).url);
    },
    async deleteCustomer(customerId) {
      // 404: o cliente já não existe (nova tentativa, ou apagado pelo painel); não pode travar a exclusão da conta.
      await call("DELETE", `customers/${encodeURIComponent(customerId)}`, undefined, 404);
    },
    async setPaused(subscriptionId, paused) {
      // void: as faturas do tempo pausado não são cobradas; vazio tira a pausa.
      const form: Record<string, string> = paused ? { "pause_collection[behavior]": "void" } : { pause_collection: "" };
      return parseStripeSubscription(await call("POST", `subscriptions/${encodeURIComponent(subscriptionId)}`, form));
    },
  };
}
