import type { Locale } from "@/i18n/locales";
/** Datas em milissegundos (a Stripe manda segundos; quem traduz é parseStripeSubscription). */
export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  currency: string;
  amount: number;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
};

export interface PaymentProvider {
  createCustomer(input: { email: string; name: string; userId: number }): Promise<string>;
  /** Assinatura do cliente que ainda dá acesso (ativa, em teste ou com pagamento pendente), direto da Stripe. */
  findOpenSubscription(customerId: string): Promise<StripeSubscription | null>;
  /** Fecha os pagamentos ainda abertos do cliente (outra aba) e abre um novo: só a aba mais nova consegue pagar. */
  createCheckout(input: { customerId: string; priceId: string; userId: number; locale: Locale; successUrl: string; cancelUrl: string; trialDays?: number }): Promise<string>;
  getCheckout(sessionId: string): Promise<{ customerId: string; subscription: StripeSubscription | null }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<string>;
  /** Apaga o cliente: a Stripe cancela na hora todas as assinaturas dele e remove nome e e-mail. */
  deleteCustomer(customerId: string): Promise<void>;
  /** Cancela no fim do período já pago: a pessoa usa até lá e não é cobrada de novo; devolve como ela ficou. */
  cancelAtPeriodEnd(subscriptionId: string): Promise<StripeSubscription>;
  /** Pausa (para de cobrar e tira o acesso) ou retoma a assinatura; devolve como ela ficou. */
  setPaused(subscriptionId: string, paused: boolean): Promise<StripeSubscription>;
}
