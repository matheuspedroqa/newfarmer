"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { diarySchema, toFieldErrors } from "@/lib/validation";
import { limitWritesLogged } from "@/server/activity-log";
import { addDiaryLogged, deleteDiaryLogged } from "@/server/audited";
import { requireAccess } from "@/server/current-user";
import { getDb } from "@/server/db";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";

export async function addDiaryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess();
  const db = await getDb();
  const limit = await limitWritesLogged(db, user, await clientIp());
  if (!limit.ok) {
    return { formError: "rateLimited" };
  }
  const parsed = diarySchema.safeParse({
    animalId: formData.get("animalId"),
    date: formData.get("date"),
    kind: formData.get("kind"),
    animalName: formData.get("animalName"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const clientId = z.string().uuid().safeParse(formData.get("clientId")).data;
  await addDiaryLogged(db, user.id, parsed.data, await clientIp(), clientId);
  revalidatePath("/", "layout");
  return { done: true };
}

export async function deleteDiaryAction(formData: FormData): Promise<void> {
  const user = await requireAccess();
  const db = await getDb();
  const limit = await limitWritesLogged(db, user, await clientIp());
  if (!limit.ok) {
    return;
  }
  await deleteDiaryLogged(db, user.id, Number(formData.get("id")), await clientIp());
  revalidatePath("/", "layout");
}
