'use client';

import { AppShell } from '@/components/layouts/AppShell';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { offlineBootstrap } from '@/lib/offline/bootstrap';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  
  // Detect dashboard pages that should have full width
  const isDashboardPage = pathname.includes('dashboard') || 
                          pathname.includes('situation-dashboard');

  useEffect(() => {
    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Initialize offline data when user is authenticated
    if (user?.roles?.[0]?.role?.name) {
      const userRole = user.roles[0].role.name as any;
      
      // Check if bootstrap is needed
      const bootstrapStatus = offlineBootstrap.getBootstrapStatus();
      if (bootstrapStatus.needsBootstrap && isOnline) {
        console.log('🔄 Auto-bootstrapping offline data for user role:', userRole);
        offlineBootstrap.bootstrap(userRole).catch(error => {
          console.warn('⚠️ Auto-bootstrap failed:', error);
        });
      }
    }
  }, [user, isOnline]);
  
  return (
    <div className="relative">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 text-center">
          <span className="text-orange-800 text-sm font-medium">
            📡 Offline Mode - Data will sync when connection is restored
          </span>
        </div>
      )}

      <AppShell isDashboard={isDashboardPage}>
        {children}
      </AppShell>

      {/* PWA Install Prompt */}
      <InstallPrompt autoShow={true} showDelay={5000} />
    </div>
  );
}