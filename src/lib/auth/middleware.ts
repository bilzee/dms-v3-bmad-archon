import { NextRequest, NextResponse } from 'next/server'
import { AuthService, AuthTokenPayload, UserWithRoles } from './service'

export interface AuthContext {
  user: UserWithRoles
  userId: string
  roles: string[]
  permissions: string[]
  request: NextRequest
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext,
  params?: any
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
      
      if (!user || !(user as any).isActive) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Build context with extracted roles and permissions (matches architecture document)
      const userRoles = user.roles.map(ur => ur.role.name) // Extract role names
      
      const context: AuthContext = { 
        user, // Full DB user object
        userId: (user as any).id,
        roles: userRoles,
        permissions: user.roles.flatMap((ur: any) => ur.role.permissions.map((p: any) => p.code)), // Extract permission codes
        request
        // Note: params not handled here - routes extract from URL manually
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

// NOTE: Deprecated decorator functions removed as they are incompatible with Next.js 14.2.5 async params
// Use manual role checks inside the handler instead
// Example: if (!context.roles.includes('COORDINATOR')) { return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }); }

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