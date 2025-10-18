'use client'

import { useEffect, useState } from 'react';
import { VerificationDashboard } from '@/components/verification/VerificationDashboard';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield } from 'lucide-react';

export default function VerificationPage() {
  const { hasRole } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by showing loading state on server
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!hasRole('COORDINATOR')) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            You do not have permission to access this page. Coordinator role is required to verify assessments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <VerificationDashboard />;
}