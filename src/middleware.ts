import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, SESSION_COOKIE } from "@/lib/cookies";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    const headers = new Headers(request.headers);
    headers.set("x-nf-locale", "pt");
    const response = NextResponse.next({ request: { headers } });
    if (!request.cookies.has(LOCALE_COOKIE)) response.cookies.set(LOCALE_COOKIE, "pt", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
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
  matcher: ["/pt", "/pt/:path*", "/dashboard/:path*", "/welcome/:path*", "/subscribe/:path*", "/profile/:path*", "/myfarm/:path*", "/animals/:path*", "/crops/:path*", "/weather/:path*", "/admin/:path*"],
};
