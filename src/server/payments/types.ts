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
  createCheckout(input: { customerId: string; priceId: string; userId: number; locale: "pt" | "en"; successUrl: string; cancelUrl: string }): Promise<string>;
  getCheckout(sessionId: string): Promise<{ customerId: string; subscription: StripeSubscription | null }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<string>;
  /** Apaga o cliente: a Stripe cancela na hora todas as assinaturas dele e remove nome e e-mail. */
  deleteCustomer(customerId: string): Promise<void>;
}
