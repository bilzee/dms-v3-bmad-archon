import { NextRequest, NextResponse } from 'next/server'
import { AuthService, AuthTokenPayload } from './service'

export interface AuthContext {
  user: AuthTokenPayload
  request: NextRequest
  params?: any
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse> | NextResponse

/**
 * Higher-order function to add authentication to API routes
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, nextContext?: any): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authorization = request.headers.get('Authorization')
      
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }

      const token = authorization.substring(7) // Remove 'Bearer ' prefix
      
      // Verify token
      const user = AuthService.verifyToken(token)
      
      // Create auth context with params from Next.js context
      const context: AuthContext = { 
        user, 
        request,
        params: nextContext?.params 
      }
      
      // Call the handler with auth context
      return await handler(request, context)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }
}

/**
 * Middleware decorator to require specific permission
 */
export function requirePermission(permissionCode: string) {
  return function(handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (request: NextRequest, context: AuthContext) => {
      if (!context.user.permissions.includes(permissionCode)) {
        return NextResponse.json(
          { error: `Missing required permission: ${permissionCode}` },
          { status: 403 }
        )
      }
      
      return handler(request, context)
    }
  }
}

/**
 * Middleware decorator to require specific role
 */
export function requireRole(roleName: string) {
  return function(handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (request: NextRequest, context: AuthContext) => {
      if (!context.user.roles.includes(roleName)) {
        return NextResponse.json(
          { error: `Missing required role: ${roleName}` },
          { status: 403 }
        )
      }
      
      return handler(request, context)
    }
  }
}

/**
 * Middleware decorator to require any of multiple roles
 */
export function requireAnyRole(...roleNames: string[]) {
  return function(handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (request: NextRequest, context: AuthContext) => {
      const hasRole = roleNames.some(role => context.user.roles.includes(role))
      
      if (!hasRole) {
        return NextResponse.json(
          { error: `Missing required role(s): ${roleNames.join(', ')}` },
          { status: 403 }
        )
      }
      
      return handler(request, context)
    }
  }
}

/**
 * Middleware decorator to require any of multiple permissions
 */
export function requireAnyPermission(...permissionCodes: string[]) {
  return function(handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (request: NextRequest, context: AuthContext) => {
      const hasPermission = permissionCodes.some(permission => 
        context.user.permissions.includes(permission)
      )
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: `Missing required permission(s): ${permissionCodes.join(', ')}` },
          { status: 403 }
        )
      }
      
      return handler(request, context)
    }
  }
}

/**
 * Extract auth token from request headers
 */
export function extractAuthToken(request: NextRequest): string | null {
  const authorization = request.headers.get('Authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.substring(7)
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthTokenPayload | null> {
  try {
    const token = extractAuthToken(request)
    
    if (!token) {
      return null
    }

    return AuthService.verifyToken(token)
  } catch {
    return null
  }
}