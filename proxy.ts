import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import settings from "@/config/settings_config";
import { verifyAdminSession } from "@/middlewares/verify_admin";
import { verifyUserSession } from "@/middlewares/verify_user";

const appConfig = settings();

// Reusable response helpers to avoid creating new objects unnecessarily
const unauthorizedResponse = (message: string) => 
  NextResponse.json({ status: "error", message, data: null, error: "Unauthorized" }, { status: 401 });

const clearCookieAndRedirect = (url: string, request: NextRequest) => {
  const response = NextResponse.redirect(new URL(url, request.url));
  response.cookies.delete(appConfig.sessionCookieName);
  return response;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. STRIP SPOOFED HEADERS IMMEDIATELY (Security First)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-admin-id");
  requestHeaders.delete("x-admin-email");
  requestHeaders.delete("x-admin-name"); 
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");
  requestHeaders.delete("x-user-name");  

  // 2. ROUTE CLASSIFICATION
  const isAdminApi = pathname.startsWith("/api/v1/admin") && !pathname.includes("/auth");
  const isAdminPage = pathname.startsWith("/admin/dashboard");
  
  const isUserApi = pathname.startsWith("/api/v1/user") && !pathname.includes("/auth");
  const isUserDashboardPage = pathname.startsWith("/user/dashboard");
  const isRootDashboardPage = pathname === "/dashboard";

  // ADMIN LOGIC
  if (isAdminApi || isAdminPage) {
    const sessionCookie = request.cookies.get(appConfig.sessionCookieName)?.value;

    // FAST FAIL: No cookie? Don't touch the database.
    if (!sessionCookie) {
      return isAdminApi 
        ? unauthorizedResponse("No admin access. Session missing.")
        : NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Verify Session (Hits Redis with a strict 50ms timeout, then Postgres)
    const admin = await verifyAdminSession(sessionCookie);

    // FAST FAIL: Invalid session
    if (!admin) {
      return isAdminApi 
        ? unauthorizedResponse("No admin access. Session invalid or expired.")
        : clearCookieAndRedirect("/admin/login", request);
    }

    // SUCCESS: Inject headers and proceed
    if (admin.id) requestHeaders.set("x-admin-id", String(admin.id));
    if (admin.email) requestHeaders.set("x-admin-email", String(admin.email));
    if (admin.account_name) requestHeaders.set("x-admin-name", String(admin.account_name)); // 🟢 Inject account name

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // USER LOGIC
  if (isUserApi || isUserDashboardPage || isRootDashboardPage) {
    const sessionCookie = request.cookies.get(appConfig.sessionCookieName)?.value;

    // FAST FAIL: No cookie?
    if (!sessionCookie) {
      if (isUserApi) return unauthorizedResponse("No user access. Session missing.");
      return NextResponse.redirect(new URL(isRootDashboardPage ? "/" : "/login", request.url));
    }

    // Safely extract IP for rate limiting/session tracking
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Verify Session
    const user = await verifyUserSession(sessionCookie, ip);

    // FAST FAIL: Invalid session
    if (!user) {
      if (isUserApi) return unauthorizedResponse("No user access. Session invalid or expired.");
      return clearCookieAndRedirect(isRootDashboardPage ? "/" : "/login", request);
    }

    // SUCCESS: Inject headers and proceed
    if (user.id) requestHeaders.set("x-user-id", String(user.id));
    if (user.email) requestHeaders.set("x-user-email", String(user.email));
    if (user.first_name) requestHeaders.set("x-user-name", String(user.first_name)); // 🟢 Inject user name (if available)

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // PUBLIC ROUTES
  // Pass through instantly with stripped headers
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