import { describe, expect, it, vi } from "vitest";
import { createStripeProvider, parseStripeSubscription } from "@/server/payments/stripe";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const asFetch = (fn: unknown) => fn as typeof fetch;

describe("cliente Stripe", () => {
  it("createCheckout manda assinatura, preço, referência e chave", async () => {
    const fetchFn = vi.fn(async () => ok({ url: "https://checkout.stripe.com/c/x" }));
    const p = createStripeProvider("sk_test_abc", asFetch(fetchFn));
    const url = await p.createCheckout({ customerId: "cus_1", priceId: "price_1", userId: 7, locale: "pt", successUrl: "https://s/ok", cancelUrl: "https://s/no" });
    expect(url).toBe("https://checkout.stripe.com/c/x");
    const [endpoint, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_abc");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price]")).toBe("price_1");
    expect(body.get("line_items[0][quantity]")).toBe("1");
    expect(body.get("client_reference_id")).toBe("7");
    expect(body.get("customer")).toBe("cus_1");
    expect(body.get("locale")).toBe("pt-BR");
    expect(body.get("subscription_data[metadata][user_id]")).toBe("7");
  });

  it("erro HTTP lança sem copiar o corpo", async () => {
    const fetchFn = vi.fn(async () => new Response('{"error":{"message":"ana@exemplo.com inválido"}}', { status: 400 }));
    const p = createStripeProvider("sk_test_abc", asFetch(fetchFn));
    const err = await p.createCustomer({ email: "ana@exemplo.com", name: "Ana", userId: 1 }).catch((e) => e as Error);
    expect((err as Error).message).toBe("Stripe respondeu 400");
  });

  it("getCheckout expande a assinatura e converte segundos em ms", async () => {
    const fetchFn = vi.fn(async () =>
      ok({ customer: "cus_1", subscription: { id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, canceled_at: null, items: { data: [{ current_period_end: 2000, price: { unit_amount: 699, currency: "brl" } }] } } }),
    );
    const p = createStripeProvider("sk_test_abc", asFetch(fetchFn));
    const r = await p.getCheckout("cs_1");
    expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe("https://api.stripe.com/v1/checkout/sessions/cs_1?expand[]=subscription");
    expect(r).toEqual({ customerId: "cus_1", subscription: { id: "sub_1", customer: "cus_1", status: "active", currency: "brl", amount: 699, currentPeriodEnd: 2_000_000, cancelAtPeriodEnd: false, canceledAt: null } });
  });

  it("parseStripeSubscription aceita current_period_end no topo e customer expandido", () => {
    const s = parseStripeSubscription({ id: "s", customer: { id: "cus_2" }, status: "trialing", current_period_end: 5, cancel_at_period_end: true, canceled_at: 9, items: { data: [{ price: { unit_amount: 199, currency: "eur" } }] } });
    expect(s).toMatchObject({ customer: "cus_2", currentPeriodEnd: 5000, canceledAt: 9000, cancelAtPeriodEnd: true, amount: 199 });
  });

  it("deleteCustomer: 404 (cliente já apagado) vale como sucesso; outros erros lançam sem o corpo", async () => {
    const gone = vi.fn(async () => new Response('{"error":{"message":"No such customer: ana@exemplo.com"}}', { status: 404 }));
    await expect(createStripeProvider("k", asFetch(gone)).deleteCustomer("cus_1")).resolves.toBeUndefined();
    const boom = vi.fn(async () => new Response("ana@exemplo.com", { status: 500 }));
    const err = await createStripeProvider("k", asFetch(boom)).deleteCustomer("cus_1").catch((e) => e as Error);
    expect((err as Error).message).toBe("Stripe respondeu 500");
    // só o DELETE de cliente tolera 404
    const gone2 = vi.fn(async () => new Response("{}", { status: 404 }));
    await expect(createStripeProvider("k", asFetch(gone2)).createPortal({ customerId: "c", returnUrl: "https://s" })).rejects.toThrow("Stripe respondeu 404");
  });

  it("deleteCustomer usa DELETE no cliente", async () => {
    const fetchFn = vi.fn(async () => ok({}));
    await createStripeProvider("k", asFetch(fetchFn)).deleteCustomer("cus_1");
    const [endpoint, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://api.stripe.com/v1/customers/cus_1");
    expect(init.method).toBe("DELETE");
  });

  it("setPaused pausa sem cobrar, retoma tirando a pausa, e assinatura pausada vira status paused", async () => {
    const sub = { id: "sub_1", customer: "cus_1", status: "active", items: { data: [{ price: { unit_amount: 699, currency: "brl" } }] } };
    const pause = vi.fn(async () => ok({ ...sub, pause_collection: { behavior: "void" } }));
    expect((await createStripeProvider("k", asFetch(pause)).setPaused("sub_1", true)).status).toBe("paused");
    const [endpoint, init] = pause.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://api.stripe.com/v1/subscriptions/sub_1");
    expect(new URLSearchParams(init.body as string).get("pause_collection[behavior]")).toBe("void");

    const resume = vi.fn(async () => ok({ ...sub, pause_collection: null }));
    expect((await createStripeProvider("k", asFetch(resume)).setPaused("sub_1", false)).status).toBe("active");
    expect((resume.mock.calls[0] as unknown as [string, RequestInit])[1].body).toBe("pause_collection=");
  });
});
