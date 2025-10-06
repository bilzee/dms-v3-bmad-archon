'use client';

import { useState } from 'react';
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
  ChevronRight
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
      icon: Users,
      description: 'User profile and settings'
    }
  ];

  const roleItems: Record<string, NavItem[]> = {
    ASSESSOR: [
      {
        name: 'Assessments',
        href: '/assessments',
        icon: FileText,
        description: 'Create and manage assessments',
        children: [
          { name: 'New Assessment', href: '/assessments/new', icon: FileText },
          { name: 'My Assessments', href: '/assessments/my', icon: FileText },
          { name: 'Surveys', href: '/surveys', icon: FileText },
        ]
      },
      {
        name: 'Reports',
        href: '/assessor/reports',
        icon: FileText,
        description: 'View assessment reports'
      }
    ],
    COORDINATOR: [
      {
        name: 'Coordination',
        href: '/coordination',
        icon: Users,
        description: 'Coordinate response efforts',
        children: [
          { name: 'Active Responses', href: '/responses', icon: AlertTriangle },
          { name: 'Verification Queue', href: '/verification', icon: FileText },
          { name: 'Resource Allocation', href: '/resources', icon: Building2 },
        ]
      },
      {
        name: 'Analytics',
        href: '/coordinator/analytics',
        icon: LayoutDashboard,
        description: 'Response analytics and insights'
      }
    ],
    RESPONDER: [
      {
        name: 'Response',
        href: '/response',
        icon: HandHeart,
        description: 'Manage response activities',
        children: [
          { name: 'Active Incidents', href: '/incidents', icon: AlertTriangle },
          { name: 'My Tasks', href: '/tasks', icon: FileText },
          { name: 'Team Status', href: '/team', icon: Users },
        ]
      },
      {
        name: 'Resources',
        href: '/responder/resources',
        icon: Building2,
        description: 'Available resources and supplies'
      }
    ],
    DONOR: [
      {
        name: 'Donations',
        href: '/donations',
        icon: HandHeart,
        description: 'Manage donations and contributions',
        children: [
          { name: 'New Donation', href: '/donations/new', icon: HandHeart },
          { name: 'Donation History', href: '/donations/history', icon: FileText },
          { name: 'Impact Reports', href: '/impact', icon: FileText },
        ]
      },
      {
        name: 'Resources',
        href: '/donor/resources',
        icon: Building2,
        description: 'Resource allocation tracking'
      }
    ],
    ADMIN: [
      {
        name: 'User Management',
        href: '/users',
        icon: Users,
        description: 'Manage system users',
        children: [
          { name: 'All Users', href: '/users', icon: Users },
          { name: 'Add User', href: '/users/new', icon: Users },
          { name: 'Role Management', href: '/roles', icon: Settings },
        ]
      },
      {
        name: 'System',
        href: '/system',
        icon: Settings,
        description: 'System administration',
        children: [
          { name: 'Settings', href: '/system/settings', icon: Settings },
          { name: 'Audit Logs', href: '/system/audit', icon: FileText },
          { name: 'Database', href: '/system/database', icon: FileText },
        ]
      },
      {
        name: 'Reports',
        href: '/admin/reports',
        icon: FileText,
        description: 'System-wide reports and analytics'
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
    return pathname === href || pathname.startsWith(href + '/');
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

    if (hasChildren) {
      return (
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between font-normal",
              depth > 0 && "ml-4",
              isItemActive && "bg-accent text-accent-foreground"
            )}
            onClick={() => toggleExpanded(item.href)}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
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
            "w-full justify-start font-normal",
            depth > 0 && "ml-4",
            isItemActive && "bg-accent text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
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