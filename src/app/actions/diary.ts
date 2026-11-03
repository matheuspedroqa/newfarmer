"use server";

import { revalidatePath } from "next/cache";
import { diarySchema, toFieldErrors } from "@/lib/validation";
import { logSafely, logWriteLimited } from "@/server/activity-log";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { addDiaryEntry, deleteDiaryEntry } from "@/server/diary";
import { limitWrites } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";
import type { FormState } from "./auth";

export async function addDiaryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  if (!(await limitWrites(db, user.id)).ok) {
    await logWriteLimited(db, user.id, user.username, await clientIp());
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
  await addDiaryEntry(db, user.id, parsed.data);
  await logSafely(db, {
    userId: user.id,
    action: "diary.created",
    details: { animal: parsed.data.animalId, kind: parsed.data.kind },
    ip: await clientIp(),
  });
  revalidatePath("/", "layout");
  return { done: true };
}

export async function deleteDiaryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  if (!(await limitWrites(db, user.id)).ok) return void (await logWriteLimited(db, user.id, user.username, await clientIp()));
  const animal = await deleteDiaryEntry(db, user.id, Number(formData.get("id")));
  if (animal) await logSafely(db, { userId: user.id, action: "diary.deleted", details: { animal }, ip: await clientIp() });
  revalidatePath("/", "layout");
}
