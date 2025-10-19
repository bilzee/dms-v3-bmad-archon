import { NextRequest, NextResponse } from 'next/server'
import { AuthService, AuthTokenPayload, UserWithRoles } from './service'

export interface AuthContext {
  user: UserWithRoles
  userId: string
  roles: string[]
  permissions: string[]
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
      const payload = AuthService.verifyToken(token)
      
      // Get fresh user data from database (matches architecture document)
      const user = await AuthService.getUserWithRoles(payload.userId)
      
      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Build context with extracted roles and permissions (matches architecture document)
      const context: AuthContext = { 
        user, // Full DB user object
        userId: user.id,
        roles: user.roles.map(ur => ur.role.name), // Extract role names
        permissions: user.roles.flatMap(ur => ur.role.permissions.map(p => p.code)), // Extract permission codes
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
      if (!context || !context.roles || !context.roles.includes(roleName)) {
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
      const hasRole = context && context.roles && roleNames.some(role => context.roles.includes(role))
      
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
      const hasPermission = context && context.permissions && permissionCodes.some(permission => 
        context.permissions.includes(permission)
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