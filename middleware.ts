import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Get the session token from cookie (JWT auth)
  const authToken = req.cookies.get('sitesense_auth')?.value;

  // Protected routes that require authentication
  const protectedRoutes = [
    '/expense-dashboard',
    '/expenses',
    '/mileage',
    '/profile',
    '/budgets',
    '/receipts',
    '/recurring',
    '/reports',
  ];

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !authToken) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth pages with active session
  if (
    (req.nextUrl.pathname === '/login' ||
      req.nextUrl.pathname === '/register' ||
      req.nextUrl.pathname.startsWith('/auth/login') ||
      req.nextUrl.pathname.startsWith('/auth/signup')) &&
    authToken
  ) {
    return NextResponse.redirect(new URL('/expense-dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/expense-dashboard/:path*',
    '/expenses/:path*',
    '/mileage/:path*',
    '/profile/:path*',
    '/budgets/:path*',
    '/receipts/:path*',
    '/recurring/:path*',
    '/reports/:path*',
    '/login',
    '/register',
    '/auth/login',
    '/auth/signup',
  ],
};
