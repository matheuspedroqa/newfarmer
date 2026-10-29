import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookies";

export function middleware(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/painel/:path*", "/myfarm/:path*", "/animais/:path*", "/plantacoes/:path*", "/clima/:path*"],
};
