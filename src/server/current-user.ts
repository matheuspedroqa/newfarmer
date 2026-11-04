import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, SESSION_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import type { User } from "./accounts";
import { getDb } from "./db";
import { getSubscription, hasAccess } from "./subscriptions";
import { createSession, deleteSession, getSessionUser } from "./sessions";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser((await getDb()), token) : null;
}

/** Usuário logado ou redireciona para /login (sessão vencida não quebra a página). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Usuário logado com assinatura (ou dono do site); senão vai para /subscribe. Cada página paga chama isto: o layout não roda de novo na navegação interna. */
export async function requireAccess(): Promise<User> {
  const user = await requireUser();
  if (!hasAccess(user, await getSubscription(await getDb(), user.id))) redirect("/subscribe");
  return user;
}

export async function startSession(user: User): Promise<void> {
  const store = await cookies();
  const token = await createSession((await getDb()), user.id);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  store.set(LOCALE_COOKIE, user.locale, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
  store.set(THEME_COOKIE, user.theme, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession((await getDb()), token);
  store.delete(SESSION_COOKIE);
}

export async function setPreferenceCookie(name: typeof LOCALE_COOKIE | typeof THEME_COOKIE, value: string) {
  (await cookies()).set(name, value, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_S });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
