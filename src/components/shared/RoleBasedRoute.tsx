'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RoleName } from '@/types/auth';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRole?: RoleName;
  requiredRoles?: RoleName[];
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export const RoleBasedRoute = ({ 
  children, 
  requiredRole,
  requiredRoles = [],
  fallbackPath,
  loadingComponent,
  errorComponent
}: RoleBasedRouteProps) => {
  const { isAuthenticated, currentRole, availableRoles } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {

      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Wait for current role to be set
      if (!currentRole) {
        // If no current role but user has roles, set first available role
        if (availableRoles.length > 0) {
          const rolePaths: Record<RoleName, string> = {
            ASSESSOR: '/assessor/dashboard',
            COORDINATOR: '/coordinator/dashboard',
            RESPONDER: '/responder/dashboard',
            DONOR: '/donor/dashboard',
            ADMIN: '/admin/dashboard',
          };
          
          router.push(rolePaths[availableRoles[0]]);
          return;
        }
        return;
      }

      // Check if user has required role
      if (requiredRole && currentRole !== requiredRole) {
        // If custom error component provided, don't redirect, show error instead
        if (errorComponent) {
          setIsChecking(false);
          return;
        }
        const fallback = fallbackPath || getDefaultPath(currentRole);
        router.push(fallback);
        return;
      }

      // Check if user has any of the required roles
      if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
        // If custom error component provided, don't redirect, show error instead
        if (errorComponent) {
          setIsChecking(false);
          return;
        }
        const fallback = fallbackPath || getDefaultPath(currentRole);
        router.push(fallback);
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [isAuthenticated, currentRole, availableRoles, router, requiredRole, requiredRoles, fallbackPath, pathname, errorComponent]);

  if (isChecking) {
    return loadingComponent || <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check access again and show error component if provided and access is denied
  if (requiredRole && currentRole !== requiredRole) {
    return errorComponent || <>{children}</>;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
    return errorComponent || <>{children}</>;
  }

  return <>{children}</>;
};

const getDefaultPath = (role: RoleName): string => {
  const paths: Record<RoleName, string> = {
    ASSESSOR: '/assessor/dashboard',
    COORDINATOR: '/coordinator/dashboard',
    RESPONDER: '/responder/dashboard',
    DONOR: '/donor/dashboard',
    ADMIN: '/admin/dashboard',
  };
  return paths[role] || '/dashboard';
};

// Hook for role-based navigation
export const useRoleNavigation = () => {
  const { currentRole, availableRoles } = useAuth();
  const router = useRouter();

  const navigateToRoleDashboard = (role?: RoleName) => {
    const targetRole = role || currentRole;
    if (!targetRole) return;

    const paths: Record<RoleName, string> = {
      ASSESSOR: '/assessor/dashboard',
      COORDINATOR: '/coordinator/dashboard',
      RESPONDER: '/responder/dashboard',
      DONOR: '/donor/dashboard',
      ADMIN: '/admin/dashboard',
    };

    router.push(paths[targetRole]);
  };

  const canAccessPath = (path: string): boolean => {
    if (!currentRole) return false;

    const rolePaths: Record<RoleName, RegExp[]> = {
      ASSESSOR: [/^\/assessor/, /^\/assessments/, /^\/surveys/],
      COORDINATOR: [/^\/coordinator/, /^\/coordination/, /^\/responses/, /^\/verification/],
      RESPONDER: [/^\/responder/, /^\/response/, /^\/incidents/],
      DONOR: [/^\/donor/, /^\/donations/, /^\/resources/],
      ADMIN: [/^\/admin/, /^\/users/, /^\/roles/, /^\/system/],
    };

    const allowedPatterns = rolePaths[currentRole] || [];
    return allowedPatterns.some(pattern => pattern.test(path));
  };

  const getAccessiblePaths = (): string[] => {
    if (!currentRole) return [];

    const pathMappings: Record<RoleName, string[]> = {
      ASSESSOR: [
        '/assessor/dashboard',
        '/assessments',
        '/assessments/new',
        '/surveys',
        '/profile'
      ],
      COORDINATOR: [
        '/coordinator/dashboard',
        '/coordination',
        '/responses',
        '/verification',
        '/reports',
        '/profile'
      ],
      RESPONDER: [
        '/responder/dashboard',
        '/response',
        '/incidents',
        '/tasks',
        '/profile'
      ],
      DONOR: [
        '/donor/dashboard',
        '/donations',
        '/resources',
        '/impact',
        '/profile'
      ],
      ADMIN: [
        '/admin/dashboard',
        '/users',
        '/roles',
        '/system',
        '/reports',
        '/profile'
      ]
    };

    return pathMappings[currentRole] || [];
  };

  return {
    navigateToRoleDashboard,
    canAccessPath,
    getAccessiblePaths,
    currentRole,
    availableRoles
  };
};