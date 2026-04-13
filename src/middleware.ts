import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe auth check only: do not import `@/auth` here — it pulls Prisma and
 * blows past Vercel’s 1 MB Edge bundle limit on hobby plans.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (path === "/" || path === "/login") {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfiguration: AUTH_SECRET not set" },
      { status: 500 },
    );
  }

  const token = await getToken({
    req: request,
    secret,
  });

  if (!token) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.nextUrl);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/api/documents",
    "/api/documents/:path*",
    "/api/explain",
    "/api/tts",
    "/api/study-notes",
  ],
};
