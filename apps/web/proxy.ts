import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Request Interception Proxy.
 * NOTE: As per architecture specifications, this is a perimeter route guard for client navigation.
 * Core authorization is independently enforced in backend route handlers and client session hooks.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has("connectly_refresh");

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Redirect logged-in users away from auth pages to chat root
  if (isAuthRoute && hasRefreshCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const matcher = [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
];

export default proxy;
