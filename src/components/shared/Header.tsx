'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleSwitcher } from '@/components/layouts/RoleSwitcher';
import { SyncIndicator } from './SyncIndicator';
import { OfflineIndicator } from './OfflineIndicator';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              DMS Borno
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <SyncIndicator />
            <OfflineIndicator />
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <RoleSwitcher />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};