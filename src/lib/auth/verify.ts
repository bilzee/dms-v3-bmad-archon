import { NextRequest } from 'next/server';
import { AuthService, AuthTokenPayload, UserWithRoles } from './service';
import { extractAuthToken } from './middleware';

export interface AuthResult {
  success: boolean;
  user?: UserWithRoles;
  payload?: AuthTokenPayload;
  error?: string;
}

/**
 * Verify token and return user with roles and permissions
 */
export async function verifyToken(request: NextRequest): Promise<AuthResult> {
  try {
    const token = extractAuthToken(request);
    
    if (!token) {
      return {
        success: false,
        error: 'Missing authorization token'
      };
    }

    // Verify and decode the token
    const payload = AuthService.verifyToken(token);
    
    // Get user with full roles and permissions from database
    const user = await AuthService.getUserWithRoles(payload.userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'User account is deactivated'
      };
    }

    if (user.isLocked) {
      return {
        success: false,
        error: 'User account is locked'
      };
    }

    return {
      success: true,
      user,
      payload
    };

  } catch (error) {
    return {
      success: false,
      error: 'Invalid or expired token'
    };
  }
}

/**
 * Verify token and check for specific role
 */
export async function verifyTokenWithRole(request: NextRequest, requiredRole: string): Promise<AuthResult> {
  const authResult = await verifyToken(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const hasRole = authResult.user.roles.some(
    userRole => userRole.role.name === requiredRole
  );

  if (!hasRole) {
    return {
      success: false,
      error: `Missing required role: ${requiredRole}`
    };
  }

  return authResult;
}

/**
 * Verify token and check for any of multiple roles
 */
export async function verifyTokenWithAnyRole(request: NextRequest, requiredRoles: string[]): Promise<AuthResult> {
  const authResult = await verifyToken(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const hasAnyRole = authResult.user.roles.some(
    userRole => requiredRoles.includes(userRole.role.name)
  );

  if (!hasAnyRole) {
    return {
      success: false,
      error: `Missing required roles: ${requiredRoles.join(', ')}`
    };
  }

  return authResult;
}

/**
 * Verify token and check for specific permission
 */
export async function verifyTokenWithPermission(request: NextRequest, requiredPermission: string): Promise<AuthResult> {
  const authResult = await verifyToken(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const permissions = authResult.user.roles.flatMap(userRole =>
    userRole.role.permissions.map(rp => rp.permission.code)
  );

  if (!permissions.includes(requiredPermission)) {
    return {
      success: false,
      error: `Missing required permission: ${requiredPermission}`
    };
  }

  return authResult;
}