import "server-only";
import type { PaymentProvider } from "./types";

const DAY = 86_400_000;

/** Sem estado: tudo sai do id (`fake_<userId>`), para o robô de ponta a ponta ser previsível. */
export function createFakePaymentProvider(): PaymentProvider {
  return {
    async createCustomer({ userId }) {
      return `fake_cus_${userId}`;
    },
    async findOpenSubscription() {
      return null;
    },
    async createCheckout({ userId, successUrl }) {
      const url = new URL(successUrl);
      url.searchParams.set("session_id", `fake_${userId}`);
      return url.toString();
    },
    async getCheckout(sessionId) {
      const userId = sessionId.replace(/^fake_/, "");
      const customer = `fake_cus_${userId}`;
      return {
        customerId: customer,
        subscription: { id: `fake_sub_${userId}`, customer, status: "active", currency: "usd", amount: 200, currentPeriodEnd: Date.now() + 30 * DAY, cancelAtPeriodEnd: false, canceledAt: null },
      };
    },
    async createPortal({ returnUrl }) {
      return returnUrl;
    },
    async deleteCustomer() {},
    async cancelAtPeriodEnd(subscriptionId) {
      const userId = subscriptionId.replace(/^fake_sub_/, "");
      return { id: subscriptionId, customer: `fake_cus_${userId}`, status: "active", currency: "usd", amount: 299, currentPeriodEnd: Date.now() + 30 * DAY, cancelAtPeriodEnd: true, canceledAt: null };
    },
    async setPaused(subscriptionId, paused) {
      const userId = subscriptionId.replace(/^fake_sub_/, "");
      return { id: subscriptionId, customer: `fake_cus_${userId}`, status: paused ? "paused" : "active", currency: "usd", amount: 200, currentPeriodEnd: Date.now() + 30 * DAY, cancelAtPeriodEnd: false, canceledAt: null };
    },
  };
}
