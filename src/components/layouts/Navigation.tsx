'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRoleNavigation } from '@/components/shared/RoleBasedRoute';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  AlertTriangle,
  HandHeart,
  Building2,
  ChevronDown,
  ChevronRight,
  Monitor,
  Package,
  TrendingUp,
  User,
  BarChart3,
  Award,
  Trophy,
  MapPin,
  Menu
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  children?: NavItem[];
}

const getNavigationItems = (role: string | null): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview and statistics'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      description: 'Your user profile and settings'
    },
    {
      name: 'Help & Support',
      href: '/help',
      icon: Settings,
      description: 'Get help and support'
    },
    {
      name: 'Logout',
      href: '/logout',
      icon: Settings,
      description: 'Sign out of your account'
    }
  ];

  const roleItems: Record<string, NavItem[]> = {
    ASSESSOR: [
      { 
        name: 'Dashboard', 
        href: '/assessor/dashboard', 
        icon: LayoutDashboard 
      },
      {
        name: 'Assessments',
        href: '/assessments',
        icon: FileText,
        children: [
          { name: 'Preliminary', href: '/assessor/preliminary-assessment', icon: FileText },
          { name: 'Rapid', href: '/assessor/rapid-assessments', icon: FileText },
          { name: 'My Assessments', href: '/assessor/rapid-assessments', icon: FileText }
        ]
      }
    ],
    COORDINATOR: [
      { 
        name: 'Dashboard', 
        href: '/coordinator/dashboard', 
        icon: LayoutDashboard 
      },
      { 
        name: 'Crisis Dashboard', 
        href: '/coordinator/dashboard?view=crisis', 
        icon: AlertTriangle,
        badge: 'NEW'
      },
      { 
        name: 'Situation Awareness', 
        href: '/coordinator/situation-dashboard', 
        icon: Monitor 
      },
      {
        name: 'Coordination',
        href: '/coordination',
        icon: Users,
        children: [
          { name: 'Verification Queue', href: '/coordinator/verification', icon: FileText },
          { name: 'Resource Allocation', href: '/resources', icon: Package }
        ]
      },
      { 
        name: 'Entity Management', 
        href: '/coordinator/entities', 
        icon: Building2 
      },
      { 
        name: 'Incidents', 
        href: '/coordinator/incidents', 
        icon: AlertTriangle,
        description: 'Manage disaster incidents'
      },
      { 
        name: 'Entity-Incident Map', 
        href: '/coordinator/entity-incident-map', 
        icon: MapPin,
        description: 'Interactive entity-incident relationship map with incident selector'
      },
        {
        name: 'Settings',
        href: '/coordinator/settings',
        icon: Settings,
        children: [
          { name: 'Gap Field Management', href: '/coordinator/settings/gap-field-management', icon: Settings },
          { name: 'Export Functions', href: '/coordinator/dashboard?tab=exports', icon: FileText },
          { name: 'Report Builder', href: '/coordinator/dashboard?tab=reports', icon: FileText }
        ]
      }
    ],
    RESPONDER: [
      { 
        name: 'Dashboard', 
        href: '/responder/dashboard', 
        icon: LayoutDashboard 
      },
      {
        name: 'Response Planning',
        href: '/responder/planning',
        icon: Package,
        children: [
          { name: 'Create Response', href: '/responder/planning/new', icon: Package },
          { name: 'My Responses', href: '/responder/responses', icon: Package },
          { name: 'Commitment Import', href: '/responder/planning?tab=commitments', icon: HandHeart }
        ]
      },
      { 
        name: 'My Tasks', 
        href: '/tasks', 
        icon: FileText 
      },
      { 
        name: 'Team Status', 
        href: '/team', 
        icon: Users 
      }
    ],
    DONOR: [
      { 
        name: 'Dashboard', 
        href: '/donor/dashboard', 
        icon: LayoutDashboard 
      },
      {
        name: 'Commitments',
        href: '/donor/dashboard',
        icon: HandHeart,
        children: [
          { name: 'Manage Commitments', href: '/donor/dashboard?tab=commitments', icon: HandHeart },
          { name: 'New Commitment', href: '/donor/dashboard?action=new-commitment', icon: HandHeart },
          { name: 'Commitment Status', href: '/donor/responses', icon: FileText }
        ]
      },
      { 
        name: 'Assigned Entities', 
        href: '/donor/entities', 
        icon: MapPin 
      },
      { 
        name: 'Performance', 
        href: '/donor/performance', 
        icon: TrendingUp 
      },
      { 
        name: 'Achievements', 
        href: '/donor/performance?tab=achievements', 
        icon: Award 
      },
      { 
        name: 'Leaderboard', 
        href: '/donor/leaderboard', 
        icon: Trophy 
      }
    ],
    ADMIN: [
      { 
        name: 'Dashboard', 
        href: '/admin/dashboard', 
        icon: LayoutDashboard 
      },
      {
        name: 'User Management',
        href: '/users',
        icon: Users,
        children: [
          { name: 'All Users', href: '/users', icon: Users },
          { name: 'Add User', href: '/users/new', icon: Users },
          { name: 'Role Management', href: '/roles', icon: Settings }
        ]
      },
      {
        name: 'System',
        href: '/system',
        icon: Settings,
        children: [
          { name: 'Settings', href: '/system/settings', icon: Settings },
          { name: 'Audit Logs', href: '/system/audit', icon: FileText },
          { name: 'Database', href: '/system/database', icon: FileText }
        ]
      },
      { 
        name: 'Donor Management', 
        href: '/admin/donors', 
        icon: Building2 
      },
      { 
        name: 'Donor Metrics', 
        href: '/admin/donors/metrics', 
        icon: BarChart3 
      }
    ]
  };

  const roleSpecificItems = roleItems[role as keyof typeof roleItems] || [];
  return [...baseItems, ...roleSpecificItems];
};

export const Navigation = () => {
  const pathname = usePathname();
  const { currentRole } = useAuth();
  const { canAccessPath } = useRoleNavigation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigationItems = getNavigationItems(currentRole);

  const toggleExpanded = (href: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href: string) => {
    // Handle query parameters and sub-paths
    const normalizePath = (path: string) => {
      if (path.includes('?')) {
        return path.split('?')[0];
      }
      return path;
    };
    
    const normalizedHref = normalizePath(href);
    const normalizedPathname = normalizePath(pathname);
    
    return normalizedPathname === normalizedHref || 
           normalizedPathname.startsWith(normalizedHref + '/') ||
           (href.includes('?') && normalizedPathname === normalizePath(href));
  };

  const isAccessible = (href: string) => {
    return canAccessPath(href);
  };

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.href);
    const isExpanded = expandedItems.has(item.href);
    const isItemAccessible = isAccessible(item.href);

    if (!isItemAccessible) {
      return null;
    }

    // Auto-expand logic handled at parent level through expanded state

    if (hasChildren) {
      return (
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between font-normal transition-colors",
              depth > 0 && "ml-4",
              isExpanded && "bg-accent text-accent-foreground",
              !isExpanded && "hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={(e) => {
              e.preventDefault();
              toggleExpanded(item.href);
            }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 transition-colors" />
              <span>{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children!.map((child) => (
                <NavItemComponent key={child.href} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link href={item.href}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal transition-colors",
            depth > 0 && "ml-4",
            isItemActive && "bg-teal-600 hover:bg-teal-700 text-white",
            !isItemActive && "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn(
              "h-4 w-4 transition-colors",
              isItemActive && "text-white"
            )} />
            <span>{item.name}</span>
            {item.badge && (
              <Badge variant={isItemActive ? "default" : "secondary"} className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </div>
        </Button>
      </Link>
    );
  };

  return (
    <nav className="space-y-2 p-4">
      {currentRole && (
        <div className="mb-6 p-3 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{currentRole}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Role-specific navigation and features
          </p>
        </div>
      )}
      
      {navigationItems.map((item) => (
        <NavItemComponent key={item.href} item={item} />
      ))}
    </nav>
  );
};