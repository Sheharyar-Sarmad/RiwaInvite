import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import settings from '@/config/settings_config';
import { verifyAdminSession } from '@/middlewares/auth/verify_admin';

const appConfig = settings();

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect Admin APIs (except login/register/auth) and Dashboard pages
  const isAdminApi = pathname.startsWith('/api/v1/admin') && !pathname.includes('/auth');
  const isAdminPage = pathname.startsWith('/admin/dashboard');

  if (!isAdminApi && !isAdminPage) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(appConfig.sessionCookieName)?.value;

  // 1. FAIL: Missing Cookie
  if (!sessionCookie) {
    if (isAdminApi) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "No admin access. Session missing.", 
          data: null, 
          error: "Unauthorized" 
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // 2. Check Session (Redis -> Postgres)
  const admin = await verifyAdminSession(sessionCookie);

  // 3. FAIL: Invalid, Expired, or Revoked Session
  if (!admin) {
    if (isAdminApi) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "No admin access. Session invalid or expired.", 
          data: null, 
          error: "Unauthorized" 
        },
        { status: 401 }
      );
    }
    
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete(appConfig.sessionCookieName);
    return response;
  }

  // 4. SUCCESS: Attach Admin ID to headers so the API can use it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-admin-id', admin.id.toString());
  if ('email' in admin) requestHeaders.set('x-admin-email', admin.email);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/api/v1/admin/:path*'
  ],
};