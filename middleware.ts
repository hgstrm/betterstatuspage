import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isDemoMode = process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
  const demoKey = process.env.DEMO_ACCESS_KEY;
  const pathname = request.nextUrl.pathname;

  // In demo mode, require demo access key via query parameter
  if (isDemoMode && demoKey) {
    // Check if user has authenticated via demo key
    const demoAuthCookie = request.cookies.get('demo_auth');
    
    // Check if this request has the demo key in query params
    const demoParam = request.nextUrl.searchParams.get('demo');
    
    if (demoParam === demoKey) {
      // Valid demo key - set cookie and allow access
      const response = NextResponse.next();
      response.cookies.set('demo_auth', demoKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }
    
    // Check if user has valid demo auth cookie
    if (demoAuthCookie?.value === demoKey) {
      return NextResponse.next();
    }
    
    // Not authenticated - redirect to demo login page
    if (pathname !== '/demo-login') {
      const loginUrl = new URL('/demo-login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Simple password protection (optional)
  const password = process.env.NEXT_PUBLIC_BACKUP_PASSWORD;

  // If no password is set, allow access
  if (!password || password === '') {
    return NextResponse.next();
  }

  // Check if user has authenticated
  const authCookie = request.cookies.get('statuspage_auth');

  if (authCookie?.value === password) {
    return NextResponse.next();
  }

  // Check if this is a login attempt
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${password}`) {
    const response = NextResponse.next();
    response.cookies.set('statuspage_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Return 401 with auth challenge
  return new NextResponse(
    JSON.stringify({
      error: 'Authentication required',
      message: 'Please provide the backup tool password',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="Statuspage Backup"',
      },
    }
  );
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/config/:path*',
    '/incidents/:path*',
    '/test-mode/preview/:path*',
    '/demo-login/:path*',
    '/',
  ],
};
