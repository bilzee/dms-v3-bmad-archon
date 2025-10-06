import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Role-based route mappings
const ROLE_ROUTES = {
  ASSESSOR: ['/assessor', '/assessments', '/surveys'],
  COORDINATOR: ['/coordinator', '/coordination', '/responses', '/verification'],
  RESPONDER: ['/responder', '/response', '/incidents'],
  DONOR: ['/donor', '/donations', '/resources'],
  ADMIN: ['/admin', '/users', '/roles', '/system'],
} as const;

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/forgot-password',
  '/reset-password',
  '/api/v1/auth',  // Allow all auth API endpoints
  '/api/health',   // Allow health check
  '/_next',        // Allow Next.js assets
  '/manifest.json',
  '/favicon.ico',
];

// Default dashboard paths by role
const DEFAULT_DASHBOARD: Record<string, string> = {
  ASSESSOR: '/assessor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  RESPONDER: '/responder/dashboard',
  DONOR: '/donor/dashboard',
  ADMIN: '/admin/dashboard',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For now, allow all other routes during development
  // TODO: Implement proper JWT token validation for protected routes
  return NextResponse.next();
}

function canAccessPath(pathname: string, role: string): boolean {
  const allowedRoutes = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];
  if (!allowedRoutes) return false;

  return allowedRoutes.some(route => pathname.startsWith(route));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};