import "server-only";
import type { Locale } from "@/i18n/locales";
import { deleteAccount } from "./account-data";
import { changePassword } from "./accounts";
import { logSafely } from "./activity-log";
import type { Db } from "./db";
import { addDiaryEntry, deleteDiaryEntry } from "./diary";
import { saveFarm } from "./farm";
import { setPreferences } from "./preferences";
import { changeCity, registerUser } from "./registration";

// Cada função faz a ação e grava o registro, para a ação (Next) só chamar uma coisa e o teste cobrir o par.
// Os detalhes guardam só identificadores (animal, tipo, contagens): nunca senha, token ou texto do diário.

export async function signUpLogged(db: Db, provider: Parameters<typeof registerUser>[1], input: Parameters<typeof registerUser>[2], ip: string) {
  const result = await registerUser(db, provider, input);
  if (result.ok) await logSafely(db, { userId: result.userId, action: "auth.signup", target: input.username, ip });
  return result;
}

export async function addDiaryLogged(db: Db, userId: number, entry: Parameters<typeof addDiaryEntry>[2], ip: string, clientId?: string) {
  const id = await addDiaryEntry(db, userId, entry, clientId);
  if (id !== null) await logSafely(db, { userId, action: "diary.created", details: { animal: entry.animalId, kind: entry.kind }, ip });
  return id;
}

export async function deleteDiaryLogged(db: Db, userId: number, entryId: number, ip: string) {
  const animal = await deleteDiaryEntry(db, userId, entryId);
  if (animal) await logSafely(db, { userId, action: "diary.deleted", details: { animal }, ip });
  return animal;
}

export async function changePasswordLogged(
  db: Db,
  user: { id: number; username: string },
  currentPassword: string,
  newPassword: string,
  keepSessionToken: string | undefined,
  ip: string,
) {
  const result = await changePassword(db, user.id, currentPassword, newPassword, keepSessionToken);
  if (result === "ok") await logSafely(db, { userId: user.id, action: "auth.passwordChanged", target: user.username, ip });
  return result;
}

export async function saveFarmLogged(db: Db, userId: number, farm: Parameters<typeof saveFarm>[2], ip: string) {
  await saveFarm(db, userId, farm);
  await logSafely(db, {
    userId,
    action: "farm.updated",
    details: { animals: Object.keys(farm.animals).length, crops: farm.crops.length },
    ip,
  });
}

export async function changeCityLogged(
  db: Db,
  provider: Parameters<typeof changeCity>[1],
  userId: number,
  city: Parameters<typeof changeCity>[3],
  ip: string,
) {
  await changeCity(db, provider, userId, city);
  await logSafely(db, { userId, action: "farm.updated", details: { change: "city" }, ip });
}

export async function saveLocaleLogged(db: Db, userId: number, locale: Locale, ip: string) {
  await setPreferences(db, userId, { locale });
  await logSafely(db, { userId, action: "profile.updated", details: { field: "locale", value: locale }, ip });
}

export async function deleteAccountLogged(db: Db, user: { id: number; username: string }, password: string, ip: string, provider?: Parameters<typeof deleteAccount>[3]) {
  const result = await deleteAccount(db, user.id, password, provider);
  if (result === "ok") await logSafely(db, { userId: user.id, action: "account.deleted", target: user.username, ip });
  return result;
}
