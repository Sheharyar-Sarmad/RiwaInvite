// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import settings from '@/config/settings_config';
import { verifyAdminSession } from '@/middlewares/verify_admin';
import { verifyUserSession } from '@/middlewares/verify_user';

const appConfig = settings();

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // ADMIN ROUTE LOGIC
  const isAdminApi = pathname.startsWith('/api/v1/admin') && !pathname.includes('/auth');
  const isAdminPage = pathname.startsWith('/admin/dashboard');

  if (isAdminApi || isAdminPage) {
    const sessionCookie = request.cookies.get(appConfig.sessionCookieName)?.value;

    if (!sessionCookie) {
      if (isAdminApi) {
        return NextResponse.json({ status: "error", message: "No admin access. Session missing.", data: null, error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const admin = await verifyAdminSession(sessionCookie);

    if (!admin) {
      if (isAdminApi) {
        return NextResponse.json({ status: "error", message: "No admin access. Session invalid or expired.", data: null, error: "Unauthorized" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete(appConfig.sessionCookieName);
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', admin.id.toString());
    if ('email' in admin) requestHeaders.set('x-admin-email', admin.email);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // USER ROUTE LOGIC
  const isUserApi = pathname.startsWith('/api/v1/user') && !pathname.includes('/auth');
  const isUserDashboardPage = pathname.startsWith('/user/dashboard');
  const isRootDashboardPage = pathname === '/dashboard'; // Specific rule for /dashboard

  if (isUserApi || isUserDashboardPage || isRootDashboardPage) {
    const sessionCookie = request.cookies.get(appConfig.sessionCookieName)?.value;

    // 1. FAIL: Missing Cookie
    if (!sessionCookie) {
      if (isUserApi) {
        return NextResponse.json({ status: "error", message: "No user access. Session missing.", data: null, error: "Unauthorized" }, { status: 401 });
      }
      
      // Your specific rule: /dashboard -> / (home page)
      if (isRootDashboardPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Standard rule for /user/dashboard -> /login
      return NextResponse.redirect(new URL('/login', request.url)); 
    }

    // 2. Check Session (Redis -> Postgres)
    const user = await verifyUserSession(sessionCookie, ip);

    // 3. FAIL: Invalid, Expired, or Revoked Session
    if (!user) {
      if (isUserApi) {
        return NextResponse.json({ status: "error", message: "No user access. Session invalid or expired.", data: null, error: "Unauthorized" }, { status: 401 });
      }
      
      // Your specific rule: /dashboard -> / (home page)
      if (isRootDashboardPage) {
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.delete(appConfig.sessionCookieName);
        return response;
      }

      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(appConfig.sessionCookieName);
      return response;
    }

    // 4. SUCCESS: Attach User ID to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id.toString());
    if ('email' in user) requestHeaders.set('x-user-email', user.email);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Allow public routes to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/api/v1/admin/:path*',
    '/dashboard',            
    '/user/dashboard/:path*',
    '/api/v1/user/:path*'    
  ],
};