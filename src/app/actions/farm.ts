"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { citySchema, farmSchema, parseCityField, parseFarmForm, toFieldErrors } from "@/lib/validation";
import { logWriteLimited } from "@/server/activity-log";
import { requireAccess, requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { changeCityLogged, saveFarmLogged } from "@/server/audited";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import { getWeatherProvider } from "@/server/weather";
import type { FormState } from "./auth";

async function validateAndSave(formData: FormData, paid: boolean): Promise<FormState | null> {
  const user = paid ? await requireAccess() : await requireUser();
  const db = await getDb();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, await clientIp());
    return { formError: "rateLimited" };
  }
  const parsed = farmSchema.safeParse(parseFarmForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  await saveFarmLogged(db, user.id, parsed.data, await clientIp());
  return null;
}

export async function saveFarmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData, true);
  if (error) return error;
  revalidatePath("/", "layout");
  return { done: true };
}

export async function saveFarmAndContinueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData, false);
  if (error) return error;
  redirect("/subscribe");
}

export async function changeCityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const limit = await limitWrites(db, user.id);
  if (!limit.ok) {
    if (limit.firstBlock) await logWriteLimited(db, user.id, user.username, await clientIp());
    return { formError: "rateLimited" };
  }
  const parsed = citySchema.safeParse(parseCityField(formData.get("city")));
  if (!parsed.success) return { fieldErrors: { city: "cityRequired" } };
  await changeCityLogged(db, getWeatherProvider(), user.id, parsed.data, await clientIp());
  revalidatePath("/", "layout");
  return { done: true };
}
