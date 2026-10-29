"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { citySchema, farmSchema, parseCityField, parseFarmForm, toFieldErrors } from "@/lib/validation";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { saveFarm } from "@/server/farm";
import { changeCity } from "@/server/registration";
import { getWeatherProvider } from "@/server/weather";
import type { FormState } from "./auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function validateAndSave(formData: FormData): Promise<FormState | null> {
  const user = await requireUser();
  const parsed = farmSchema.safeParse(parseFarmForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  saveFarm(getDb(), user.id, parsed.data);
  return null;
}

export async function saveFarmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData);
  if (error) return error;
  revalidatePath("/", "layout");
  return { done: true };
}

export async function saveFarmAndContinueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const error = await validateAndSave(formData);
  if (error) return error;
  redirect("/painel");
}

export async function changeCityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = citySchema.safeParse(parseCityField(formData.get("city")));
  if (!parsed.success) return { fieldErrors: { city: "cityRequired" } };
  await changeCity(getDb(), getWeatherProvider(), user.id, parsed.data);
  revalidatePath("/", "layout");
  return { done: true };
}
