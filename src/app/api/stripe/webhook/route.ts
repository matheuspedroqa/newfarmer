import { getDb } from "@/server/db";
import { handleStripeWebhook } from "@/server/stripe-webhook";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleStripeWebhook(request, getDb);
