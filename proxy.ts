import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import settings from "@/config/settings_config";
import { verifyAdminSession } from "@/middlewares/verify_admin";
import { verifyUserSession } from "@/middlewares/verify_user";

const appConfig = settings();

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Safely extract the first IP from x-forwarded-for (handles comma-separated lists)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  // 1. INITIALIZE HEADERS & STRIP SPOOFING ATTEMPTS
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-admin-id");
  requestHeaders.delete("x-admin-email");
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");

  // ADMIN ROUTE LOGIC
  const isAdminApi =
    pathname.startsWith("/api/v1/admin") && !pathname.includes("/auth");
  const isAdminPage = pathname.startsWith("/admin/dashboard");

  if (isAdminApi || isAdminPage) {
    const sessionCookie = request.cookies.get(
      appConfig.sessionCookieName,
    )?.value;

    // 1. FAIL: Missing Cookie
    if (!sessionCookie) {
      if (isAdminApi) {
        return NextResponse.json(
          {
            status: "error",
            message: "No admin access. Session missing.",
            data: null,
            error: "Unauthorized",
          },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // 2. Check Session
    const admin = await verifyAdminSession(sessionCookie);

    // 3. FAIL: Invalid Session
    if (!admin) {
      if (isAdminApi) {
        const response = NextResponse.json(
          {
            status: "error",
            message: "No admin access. Session invalid or expired.",
            data: null,
            error: "Unauthorized",
          },
          { status: 401 },
        );
        response.cookies.delete(appConfig.sessionCookieName);
        return response;
      }
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url),
      );
      response.cookies.delete(appConfig.sessionCookieName);
      return response;
    }

    // 4. SUCCESS: Attach Headers
    if (admin.id) requestHeaders.set("x-admin-id", String(admin.id));
    if (admin.email) requestHeaders.set("x-admin-email", String(admin.email));

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // USER ROUTE LOGIC
  const isUserApi =
    pathname.startsWith("/api/v1/user") && !pathname.includes("/auth");
  const isUserDashboardPage = pathname.startsWith("/user/dashboard");
  const isRootDashboardPage = pathname === "/dashboard";

  if (isUserApi || isUserDashboardPage || isRootDashboardPage) {
    const sessionCookie = request.cookies.get(
      appConfig.sessionCookieName,
    )?.value;

    // 1. FAIL: Missing Cookie
    if (!sessionCookie) {
      if (isUserApi) {
        return NextResponse.json(
          {
            status: "error",
            message: "No user access. Session missing.",
            data: null,
            error: "Unauthorized",
          },
          { status: 401 },
        );
      }
      if (isRootDashboardPage) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 2. Check Session (Redis -> Postgres)
    const user = await verifyUserSession(sessionCookie, ip);

    // 3. FAIL: Invalid Session
    if (!user) {
      if (isUserApi) {
        const response = NextResponse.json(
          {
            status: "error",
            message: "No user access. Session invalid or expired.",
            data: null,
            error: "Unauthorized",
          },
          { status: 401 },
        );
        response.cookies.delete(appConfig.sessionCookieName);
        return response;
      }
      const redirectUrl = isRootDashboardPage ? "/" : "/login";
      const response = NextResponse.redirect(new URL(redirectUrl, request.url));
      response.cookies.delete(appConfig.sessionCookieName);
      return response;
    }

    // 4. SUCCESS: Attach Headers
    if (user.id) requestHeaders.set("x-user-id", String(user.id));
    if (user.email) requestHeaders.set("x-user-email", String(user.email));

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // PUBLIC ROUTES
  // Allow public routes to pass through, but still strip spoofed headers just in case
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/api/v1/admin/:path*",
    "/dashboard",
    "/user/dashboard/:path*",
    "/api/v1/user/:path*",
  ],
};
