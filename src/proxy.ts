import { NextResponse, type NextRequest } from "next/server";
import { isAdminPath, isPublicAdminPath } from "@/app/admin/_lib/auth-routes";
import { SESSION_COOKIE } from "@/app/admin/_lib/session-cookie";
import { jwtSessionVerifier } from "@/modules/auth/infrastructure/jwt-session-verifier";
import { createEdgeAuthApplication } from "@/modules/auth/application/edge";

const { verifySessionToken } = createEdgeAuthApplication({ verifier: jwtSessionVerifier });

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (isPublicAdminPath(pathname)) {
    if (session && pathname !== "/admin/reset-password") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
