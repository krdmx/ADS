import { NextResponse, type NextRequest } from "next/server";

import { appUrl, buildAppUrl, isAppHost, isMarketingHost } from "@/lib/app-urls";

function buildCallbackUrl(request: NextRequest) {
  const url = request.nextUrl;
  return `${appUrl}${url.pathname}${url.search}`;
}

function hasAuthSessionCookie(request: NextRequest) {
  return [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
  ].some((cookieName) => request.cookies.has(cookieName));
}

export default function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/auth");
  const hasSessionCookie = hasAuthSessionCookie(request);

  if (isMarketingHost(host) && pathname !== "/") {
    return NextResponse.redirect(buildAppUrl(`${pathname}${request.nextUrl.search}`));
  }

  if (!isAppHost(host)) {
    return NextResponse.next();
  }

  if (hasSessionCookie && isAuthPage) {
    return NextResponse.redirect(buildAppUrl("/"));
  }

  if (!hasSessionCookie && !isAuthPage) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", buildCallbackUrl(request));
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
