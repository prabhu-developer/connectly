import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Request Interception Proxy.
 * NOTE: As per architecture specifications, this is a perimeter route guard for client navigation.
 * Core authorization is independently enforced in backend route handlers and client session hooks.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthCookie =
    request.cookies.has("connectly_refresh") || request.cookies.has("connectly_access");

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Redirect logged-in users away from auth pages to chat root
  if (isAuthRoute && hasAuthCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated visitors attempting to view chat to login
  if (!isAuthRoute && !hasAuthCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default proxy;
