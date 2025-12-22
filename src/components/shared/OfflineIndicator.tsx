'use client';

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/stores/offline.store';

export const OfflineIndicator = () => {
  const { isOnline, isConnecting, setOnlineStatus, setConnecting } = useOfflineStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side to avoid hydration mismatch
    setIsClient(true);
    
    const updateOnlineStatus = () => {
      setOnlineStatus(navigator.onLine);
    };

    const handleOnline = () => {
      setConnecting(true);
      // Simulate connection verification delay
      setTimeout(() => {
        setOnlineStatus(true);
      }, 1000);
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    // Set initial status only on client-side
    updateOnlineStatus();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, setConnecting]);

  // Prevent hydration mismatch by showing loading state until client-side
  if (!isClient) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card shadow-sm border border-border text-muted-foreground">
        <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (isConnecting) {
      return (
        <div className="animate-spin">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
              className="animate-spin"
            />
          </svg>
        </div>
      );
    }

    if (isOnline) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24.24 8L23 6.77c-5.29-5.29-13.87-5.29-19.16 0L2.59 8.01l2.83 2.83c2.65-2.66 6.95-2.66 9.6 0L17.85 8l2.83 2.83c1.32-1.32 3.47-1.32 4.79 0L24.24 8zM3.83 6.77L2.59 8.01 8.48 13.9l1.41-1.41-6.06-5.72zm16.34 0L19 8.01l-5.89 5.89 1.41 1.41 6.06-5.72z"/>
        <path d="M21.41 11.42L20 12.83l-8 8-8-8L2.59 11.42 12 20.83l9.41-9.41z" opacity="0.3"/>
      </svg>
    );
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    return isOnline ? 'Online' : 'Offline';
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600 dark:text-yellow-400';
    return isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <div 
      className="relative"
      data-testid="offline-indicator"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-card shadow-sm border border-border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg whitespace-nowrap z-50 border border-border shadow-lg">
          {isOnline
            ? 'Connected to internet. Data will sync automatically.'
            : 'No internet connection. Working offline with local data.'
          }
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
        </div>
      )}
    </div>
  );
};