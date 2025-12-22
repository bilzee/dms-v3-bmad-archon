'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href: string;
}

const breadcrumbStructure: Record<string, BreadcrumbItem[]> = {
  '/coordinator/situation-dashboard': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Situation Awareness', href: '/coordinator/situation-dashboard' }
  ],
  '/coordinator/entities': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Entity Management', href: '/coordinator/entities' }
  ],
  '/coordinator/incidents': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Incidents', href: '/coordinator/incidents' }
  ],
  '/coordinator/analytics': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Analytics', href: '/coordinator/analytics' }
  ],
  '/coordinator/settings': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Settings', href: '/coordinator/settings' }
  ],
  '/assessor/preliminary-assessment': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assessments', href: '/assessments' },
    { name: 'Preliminary', href: '/assessor/preliminary-assessment' }
  ],
  '/rapid-assessments': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assessments', href: '/assessments' },
    { name: 'Rapid', href: '/rapid-assessments' }
  ],
  '/assessments/my': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assessments', href: '/assessments' },
    { name: 'My Assessments', href: '/assessments/my' }
  ],
  '/assessments/new': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assessments', href: '/assessments' },
    { name: 'New Assessment', href: '/assessments/new' }
  ],
  '/surveys': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assessments', href: '/assessments' },
    { name: 'Surveys', href: '/surveys' }
  ],
  '/assessor/reports': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Reports', href: '/assessor/reports' }
  ],
  '/responder/planning': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Response Planning', href: '/responder/planning' }
  ],
  '/responder/planning/new': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Response Planning', href: '/responder/planning' },
    { name: 'Create Response', href: '/responder/planning/new' }
  ],
  '/responder/responses': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Response Planning', href: '/responder/planning' },
    { name: 'My Responses', href: '/responder/responses' }
  ],
  '/responder/resources': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Resources', href: '/responder/resources' }
  ],
  '/donor/dashboard': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Donor Dashboard', href: '/donor/dashboard' }
  ],
  '/donor/entities': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Assigned Entities', href: '/donor/entities' }
  ],
  '/donor/responses': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Donor Dashboard', href: '/donor/dashboard' },
    { name: 'Commitment Status', href: '/donor/responses' }
  ],
  '/donor/performance': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Performance', href: '/donor/performance' }
  ],
  '/donor/leaderboard': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Leaderboard', href: '/donor/leaderboard' }
  ],
  '/users': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'User Management', href: '/users' }
  ],
  '/users/new': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'User Management', href: '/users' },
    { name: 'Add User', href: '/users/new' }
  ],
  '/roles': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'User Management', href: '/users' },
    { name: 'Role Management', href: '/roles' }
  ],
  '/system/settings': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'System', href: '/system' },
    { name: 'Settings', href: '/system/settings' }
  ],
  '/system/audit': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'System', href: '/system' },
    { name: 'Audit Logs', href: '/system/audit' }
  ],
  '/system/database': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'System', href: '/system' },
    { name: 'Database', href: '/system/database' }
  ],
  '/admin/donors': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Donor Management', href: '/admin/donors' }
  ],
  '/admin/donors/metrics': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Donor Management', href: '/admin/donors' },
    { name: 'Donor Metrics', href: '/admin/donors/metrics' }
  ],
  '/incidents': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Active Incidents', href: '/incidents' }
  ],
  '/tasks': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'My Tasks', href: '/tasks' }
  ],
  '/team': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Team Status', href: '/team' }
  ],
  '/profile': [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Profile', href: '/profile' }
  ]
};

const generateDynamicBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem = { name: 'Dashboard', href: '/dashboard' };
  
  // Handle query parameters and dynamic paths
  if (pathname.includes('?tab=exports') || pathname.includes('/dashboard?tab=exports')) {
    return [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Settings', href: '/coordinator/settings' },
      { name: 'Export Functions', href: '/coordinator/dashboard?tab=exports' }
    ];
  }
  
  if (pathname.includes('?tab=reports') || pathname.includes('/dashboard?tab=reports')) {
    return [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Settings', href: '/coordinator/settings' },
      { name: 'Report Builder', href: '/coordinator/dashboard?tab=reports' }
    ];
  }
  
  if (pathname.includes('?tab=commitments') || pathname.includes('/dashboard?tab=commitments')) {
    return [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Donor Dashboard', href: '/donor/dashboard' },
      { name: 'Manage Commitments', href: '/donor/dashboard?tab=commitments' }
    ];
  }
  
  if (pathname.includes('?tab=achievements') || pathname.includes('/performance?tab=achievements')) {
    return [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Performance', href: '/donor/performance' },
      { name: 'Achievements', href: '/donor/performance?tab=achievements' }
    ];
  }
  
  if (pathname.includes('?action=new-commitment')) {
    return [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Donor Dashboard', href: '/donor/dashboard' },
      { name: 'New Commitment', href: '/donor/dashboard?action=new-commitment' }
    ];
  }

  // Handle dynamic paths with IDs
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts.length > 1 && pathParts[0] === 'api') {
    // API routes don't need breadcrumbs
    return [];
  }
  
  // Default fallback for unregistered routes
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 1) {
    return [
      breadcrumbs,
      { 
        name: segments[segments.length - 1].charAt(0).toUpperCase() + 
              segments[segments.length - 1].slice(1).replace(/-/g, ' '), 
        href: pathname 
      }
    ];
  }
  
  return [breadcrumbs];
};

export const Breadcrumbs = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();
  
  // Get predefined breadcrumbs or generate dynamic ones
  const breadcrumbs = breadcrumbStructure[pathname] || generateDynamicBreadcrumbs(pathname);
  
  // Don't show breadcrumbs on dashboard root
  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }
  
  if (breadcrumbs.length === 0) {
    return null;
  }
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.href}>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium" aria-current="page">
              {item.name}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};