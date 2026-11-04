"use server";

import { redirect } from "next/navigation";
import { logSafely } from "@/server/activity-log";
import { getDb } from "@/server/db";
import { unsubscribeByToken } from "@/server/marketing";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";

/** Descadastro pelo botão da página: o token do link é a única credencial. */
export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = await getDb();
  const ip = await clientIp();
  const limit = await limitByIp(db, "unsubscribe", ip);
  if (!limit.ok) {
    if (limit.firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "unsubscribe" }, ip });
    redirect(`/unsubscribe/${encodeURIComponent(token)}?r=limited`);
  }
  const ok = await unsubscribeByToken(db, token, ip);
  redirect(`/unsubscribe/${encodeURIComponent(token)}?r=${ok ? "ok" : "invalid"}`);
}
