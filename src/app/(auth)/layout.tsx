'use client';

import { AppShell } from '@/components/layouts/AppShell';
import { usePathname } from 'next/navigation';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Detect dashboard pages that should have full width
  const isDashboardPage = pathname.includes('dashboard') || 
                          pathname.includes('situation-dashboard');
  
  return (
    <AppShell isDashboard={isDashboardPage}>
      {children}
    </AppShell>
  );
}