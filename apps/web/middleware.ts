import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/profile',
  '/appointments',
  '/clients',
  '/reports'
];

// Routes that should redirect authenticated users away (login, register)
const authRoutes = [
  '/login',
  '/register'
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/api/health',
  '/design-system'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the route is an auth route (login/register)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.includes(pathname) || 
                       pathname.startsWith('/api/') || 
                       pathname.startsWith('/_next/') ||
                       pathname.includes('.') ||
                       pathname === '/favicon.ico';
  
  // Get authentication token from cookies
  // Check for any Supabase-related cookies (dynamic detection)
  const allCookies = request.cookies.getAll();
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') && 
    (cookie.name.includes('auth') || cookie.name.includes('token'))
  );
  
  // Log for debugging
  console.log('🛡️ Middleware - Total cookies:', allCookies.length);
  console.log('🛡️ Middleware - Supabase cookies found:', supabaseCookies.map(c => c.name));
  
  const isAuthenticated = supabaseCookies.length > 0 && supabaseCookies.some(c => c.value);
  
  // Fallback to legacy cookie names for backward compatibility
  const legacyAuthToken = request.cookies.get('sb-access-token');
  const legacyRefreshToken = request.cookies.get('sb-refresh-token');
  const hasLegacyCookies = !!(legacyAuthToken && refreshToken);
  
  const finalIsAuthenticated = isAuthenticated || hasLegacyCookies;
  
  // If accessing a protected route without authentication
  if (isProtectedRoute && !finalIsAuthenticated) {
    console.log('🛡️ Middleware - Redirecting to login, no auth found');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }
  
  // If authenticated user tries to access auth routes, redirect to dashboard
  if (isAuthRoute && finalIsAuthenticated) {
    console.log('🛡️ Middleware - Redirecting to dashboard, user already auth');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // For all other routes, continue normally
  return NextResponse.next();
}

// Configure which routes should be processed by this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};