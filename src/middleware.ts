import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(COOKIE_NAME)?.value ??
    request.headers.get("Authorization")?.replace(/^Bearer\s+/, "");

  if (!token) {
    return unauthorized(request);
  }

  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    return unauthorized(request);
  }
}

function unauthorized(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です。" } },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
