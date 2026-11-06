import { NextResponse, type NextRequest } from "next/server";
import { browserLocale, localePrefix } from "@/i18n/locales";
import { LOCALE_COOKIE, SESSION_COOKIE } from "@/lib/cookies";
import { guidePath, parseGuide } from "@/lib/plant-guide";

// Páginas públicas em inglês na raiz que têm versão em /pt e /es.
const ROOT_PAGES = new Set(["/", "/privacy", "/terms", "/contact", "/try"]);

/** Primeira visita (sem idioma escolhido) a uma página em inglês com o navegador em português ou espanhol: leva à versão desse idioma. */
function browserRedirect(request: NextRequest): URL | null {
  if (request.cookies.has(LOCALE_COOKIE)) return null;
  const lang = browserLocale(request.headers.get("accept-language"));
  if (!lang || lang === "en") return null;
  const { pathname, search } = request.nextUrl;
  let target: string | null = null;
  if (ROOT_PAGES.has(pathname)) target = localePrefix(lang) + (pathname === "/" ? "" : pathname);
  const guide = /^\/what-to-plant(?:\/([^/]+)\/([^/]+))?\/?$/.exec(pathname);
  if (guide) {
    const g = guide[1] ? parseGuide("en", guide[1], guide[2]) : null;
    target = !guide[1] ? guidePath(lang) : g && guidePath(lang, g.country, g.month);
  }
  return target ? new URL(target + search, request.url) : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const toBrowserLang = browserRedirect(request);
  if (toBrowserLang) return NextResponse.redirect(toBrowserLang);
  if (ROOT_PAGES.has(pathname)) return NextResponse.next();
  // /what-to-plant é a versão em inglês das páginas públicas "o que plantar": o idioma vem do endereço, não do cookie.
  const prefixed = /^\/(pt|es)(?:\/|$)/.exec(pathname)?.[1] ?? (/^\/what-to-plant(?:\/|$)/.test(pathname) ? "en" : undefined);
  if (prefixed) {
    const headers = new Headers(request.headers);
    headers.set("x-nf-locale", prefixed);
    const response = NextResponse.next({ request: { headers } });
    if (!request.cookies.has(LOCALE_COOKIE)) response.cookies.set(LOCALE_COOKIE, prefixed, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }
  if (!request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // O layout do app lê o caminho daqui para decidir o bloqueio sem assinatura.
  const headers = new Headers(request.headers);
  headers.set("x-nf-path", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/", "/privacy", "/terms", "/contact", "/try", "/pt", "/pt/:path*", "/es", "/es/:path*", "/what-to-plant", "/what-to-plant/:path*", "/dashboard/:path*", "/welcome/:path*", "/subscribe/:path*", "/profile/:path*", "/myfarm/:path*", "/animals/:path*", "/crops/:path*", "/weather/:path*", "/admin/:path*"],
};
