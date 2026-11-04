"use server";

import { redirect } from "next/navigation";
import { logSafely } from "@/server/activity-log";
import { getDb } from "@/server/db";
import { unsubscribeAttempt } from "@/server/marketing";
import { clientIp } from "@/server/request-context";

/** Descadastro pelo botão da página: o token do link é a única credencial. */
export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = await getDb();
  const ip = await clientIp();
  const { result, firstBlock } = await unsubscribeAttempt(db, token, ip);
  if (firstBlock) await logSafely(db, { userId: null, action: "security.rateLimited", target: ip, details: { limit: "unsubscribe" }, ip });
  redirect(`/unsubscribe/${encodeURIComponent(token)}?r=${result}`);
}
