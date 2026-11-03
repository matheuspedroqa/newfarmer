import "server-only";
import { notFound } from "next/navigation";
import type { User } from "./accounts";
import { requireUser } from "./current-user";

/** Só o dono do site passa; para os outros a página nem existe (404). */
export async function requirePlatformAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) notFound();
  return user;
}
