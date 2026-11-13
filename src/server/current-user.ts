import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { LOCALE_COOKIE, SESSION_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import type { User } from "./accounts";
import { getDb } from "./db";
import { getSubscription, hasAccess } from "./subscriptions";
import { createSession, deleteSession, getSessionUser, SESSION_TTL_MS } from "./sessions";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

// cache: o layout e a página do app perguntam a mesma coisa; numa mesma página, o banco responde uma vez só.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(await getDb(), token) : null;
});

export const subscriptionOf = cache(async (userId: number) => getSubscription(await getDb(), userId));

/** Usuário logado ou redireciona para /login (sessão vencida não quebra a página). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Usuário logado com assinatura (ou dono do site); senão vai para /subscribe. Cada página paga chama isto: o layout não roda de novo na navegação interna. */
export async function requireAccess(): Promise<User> {
  const user = await requireUser();
  if (!hasAccess(user, await subscriptionOf(user.id))) redirect("/subscribe");
  return user;
}

/** `remember`: o cookie sobrevive a fechar o navegador e a sessão aguenta 7 dias sem uso (em vez de 3 horas). */
export async function startSession(user: User, remember = false): Promise<void> {
  const store = await cookies();
  const token = await createSession((await getDb()), user.id, Date.now(), remember);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: SESSION_TTL_MS / 1000 } : {}),
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
