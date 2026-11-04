import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "./db";
import { parseStripeSubscription } from "./payments/stripe";
import { upsertSubscription, userIdForCustomer } from "./subscriptions";

// Stripe-Signature: t=<segundos>,v1=<hex>[,v1=<hex>]; assinatura = HMAC-SHA256(segredo, `${t}.${corpo cru}`).
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header) return false;
  let t = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    const key = part.slice(0, i);
    const value = part.slice(i + 1);
    if (key === "t" && Number.isNaN(t)) t = Number(value);
    else if (key === "v1") signatures.push(value);
  }
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return signatures.some((sig) => {
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

const MAX_BODY = 1_048_576; // 1 MB: a rota é pública
const SUBSCRIPTION_EVENTS = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]);

/** `db` pode ser uma função: o banco só abre depois que a assinatura passou. */
export async function handleStripeWebhook(request: Request, db: Db | (() => Promise<Db>)): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook não configurado", { status: 500 });
  // Corpo limitado antes de ler e antes da assinatura (que precisa do corpo inteiro).
  if (Number(request.headers.get("content-length")) > MAX_BODY) return new Response("corpo grande demais", { status: 413 });
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY) return new Response("corpo grande demais", { status: 413 });
  if (!verifyStripeSignature(body, request.headers.get("stripe-signature"), secret)) return new Response("assinatura inválida", { status: 401 });

  let event: { id?: unknown; type?: unknown; created?: unknown; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("corpo inválido", { status: 400 });
  }
  const eventId = event.id;
  if (typeof eventId !== "string" || typeof event.type !== "string") return new Response("evento inválido", { status: 400 });
  if (!SUBSCRIPTION_EVENTS.has(event.type) || !event.data?.object) return new Response("ok");

  const sub = parseStripeSubscription(event.data.object);
  const deleted = event.type === "customer.subscription.deleted";
  const handle = typeof db === "function" ? await db() : db;
  // Numa transação: se gravar falhar, o evento não fica marcado como recebido e a Stripe tenta de novo.
  await handle.transaction(async (tx) => {
    const fresh = await tx.query("INSERT INTO stripe_events (id, received_at) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id", [eventId, Date.now()]);
    if (fresh.length === 0) return;
    const userId = await userIdForCustomer(tx, sub.customer);
    if (userId === null) return;
    await upsertSubscription(tx, userId, sub.customer, deleted ? { ...sub, status: "canceled", canceledAt: sub.canceledAt ?? Date.now() } : sub, Date.now(), typeof event.created === "number" ? event.created : null);
  });
  return new Response("ok");
}
