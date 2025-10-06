'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/shared/Header';
import { Navigation } from '@/components/layouts/Navigation';
import { RoleSwitcher } from '@/components/layouts/RoleSwitcher';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export const AppShell = ({ children, showNavigation = true }: AppShellProps) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Navigation />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex h-full flex-col">
          {/* Logo and role switcher */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-lg font-semibold text-gray-900">DMS Borno</h1>
            <RoleSwitcher />
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <Navigation />
          </div>
          
          {/* Status indicators */}
          <div className="p-4 border-t space-y-2">
            <SyncIndicator />
            <OfflineIndicator />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">DMS Borno</h1>
            </div>
            
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden sm:block">
                <SyncIndicator />
              </div>
              <OfflineIndicator />
              <RoleSwitcher />
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};