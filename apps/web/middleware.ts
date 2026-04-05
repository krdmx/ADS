import { NextResponse, type NextRequest } from "next/server";

import { buildAppUrl, isAppHost, isMarketingHost } from "@/lib/app-urls";

export default function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  if (isMarketingHost(host) && pathname !== "/") {
    return NextResponse.redirect(
      buildAppUrl(`${pathname}${request.nextUrl.search}`)
    );
  }

  if (!isAppHost(host)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
