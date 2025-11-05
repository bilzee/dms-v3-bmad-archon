'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  // Show loading while redirecting
  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to DMS Borno
        </h1>
        <p className="text-lg text-gray-600">
          {(user as any)?.name ? `Hello, ${(user as any).name}` : 'Disaster Management System Dashboard'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <p className="text-gray-600 mb-4">
          You are successfully logged in to the Disaster Management System. 
          This is the main dashboard where you can access your assigned functions based on your role.
        </p>
        
        {user?.roles && user.roles.length > 0 && (
          <div className="mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-2">Your Roles:</h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role: any) => (
                <span 
                  key={role.id} 
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            📍 This dashboard will be expanded with role-specific features in future stories.
          </p>
        </div>
      </div>
    </div>
  );
}