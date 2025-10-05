import { useEffect, useCallback, useRef } from 'react';
import { useSyncStore, useSyncStatus, useSyncActions } from '@/stores/sync.store';
import { syncEngine } from '@/lib/sync/engine';

export interface UseSyncOptions {
  autoInitialize?: boolean;
  enableAutoSync?: boolean;
  syncInterval?: number; // minutes
  enableNotifications?: boolean;
}

export interface UseSyncReturn {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  
  // Actions
  triggerSync: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  retryFailed: () => Promise<void>;
  clearFailed: () => Promise<void>;
  
  // Queue Operations
  addToQueue: (
    type: 'assessment' | 'response' | 'entity',
    action: 'create' | 'update' | 'delete',
    entityUuid: string,
    data: any,
    priority?: number
  ) => Promise<void>;
}

export const useSync = (options: UseSyncOptions = {}): UseSyncReturn => {
  const {
    autoInitialize = true,
    enableAutoSync = true,
    syncInterval = 5,
    enableNotifications = true
  } = options;

  const status = useSyncStatus();
  const { triggerManualSync, startAutoSync, stopAutoSync, retryFailedItems, clearFailedItems } = useSyncActions();
  const { initialize, cleanup, updateSettings } = useSyncStore();
  
  const initializeRef = useRef(false);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sync system
  useEffect(() => {
    if (autoInitialize && !initializeRef.current) {
      initializeRef.current = true;
      initialize().catch(error => {
        console.error('Failed to initialize sync system:', error);
      });
      
      // Apply settings
      updateSettings({
        autoSync: enableAutoSync,
        syncInterval,
        showSyncNotifications: enableNotifications
      });
    }

    return () => {
      if (initializeRef.current) {
        cleanup();
        initializeRef.current = false;
      }
    };
  }, [autoInitialize, initialize, cleanup, updateSettings, enableAutoSync, syncInterval, enableNotifications]);

  // Auto-sync interval
  useEffect(() => {
    if (enableAutoSync && status.isOnline && !status.syncInProgress) {
      // Clear existing interval
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }

      // Set up new interval
      autoSyncIntervalRef.current = setInterval(() => {
        if (status.isOnline && !status.syncInProgress) {
          triggerManualSync().catch(error => {
            console.error('Auto-sync failed:', error);
          });
        }
      }, syncInterval * 60 * 1000); // Convert minutes to milliseconds

      return () => {
        if (autoSyncIntervalRef.current) {
          clearInterval(autoSyncIntervalRef.current);
          autoSyncIntervalRef.current = null;
        }
      };
    }
  }, [enableAutoSync, status.isOnline, status.syncInProgress, syncInterval, triggerManualSync]);

  // Trigger sync
  const triggerSync = useCallback(async (): Promise<void> => {
    try {
      await triggerManualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }, [triggerManualSync]);

  // Retry failed items
  const retryFailed = useCallback(async (): Promise<void> => {
    try {
      await retryFailedItems();
    } catch (error) {
      console.error('Retry failed items failed:', error);
      throw error;
    }
  }, [retryFailedItems]);

  // Clear failed items
  const clearFailed = useCallback(async (): Promise<void> => {
    try {
      await clearFailedItems();
    } catch (error) {
      console.error('Clear failed items failed:', error);
      throw error;
    }
  }, [clearFailedItems]);

  // Add to sync queue
  const addToQueue = useCallback(async (
    type: 'assessment' | 'response' | 'entity',
    action: 'create' | 'update' | 'delete',
    entityUuid: string,
    data: any,
    priority: number = 5
  ): Promise<void> => {
    try {
      await syncEngine.addToQueue(type, action, entityUuid, data, priority);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }, []);

  return {
    // Status
    isOnline: status.isOnline,
    isSyncing: status.syncInProgress,
    syncProgress: status.syncProgress,
    lastSyncAttempt: status.lastSyncAttempt,
    lastSuccessfulSync: status.lastSuccessfulSync,
    
    // Actions
    triggerSync,
    startAutoSync,
    stopAutoSync,
    retryFailed,
    clearFailed,
    
    // Queue Operations
    addToQueue
  };
};

// Helper hook for just sync status
export const useSyncIndicator = () => {
  const status = useSyncStatus();
  
  return {
    isOnline: status.isOnline,
    isSyncing: status.syncInProgress,
    syncProgress: status.syncProgress,
    statusText: getSyncStatusText(status),
    statusColor: getSyncStatusColor(status),
    icon: getSyncStatusIcon(status)
  };
};

// Helper functions
function getSyncStatusText(status: ReturnType<typeof useSyncStatus>): string {
  if (status.syncInProgress) {
    return status.syncMessage || `Syncing... ${Math.round(status.syncProgress)}%`;
  }
  
  if (!status.isOnline) {
    return 'Offline';
  }
  
  return 'Online';
}

function getSyncStatusColor(status: ReturnType<typeof useSyncStatus>): string {
  if (status.syncInProgress) return 'text-blue-600';
  if (!status.isOnline) return 'text-gray-600';
  return 'text-green-600';
}

function getSyncStatusIcon(status: ReturnType<typeof useSyncStatus>): 'syncing' | 'offline' | 'online' {
  if (status.syncInProgress) return 'syncing';
  if (!status.isOnline) return 'offline';
  return 'online';
}

// Hook for manual sync with notifications
export const useManualSync = (options: { showNotifications?: boolean } = {}) => {
  const { showNotifications = true } = options;
  const { triggerManualSync } = useSyncActions();
  
  const triggerWithNotification = useCallback(async () => {
    try {
      if (showNotifications) {
        // Show starting notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Sync Starting', {
            body: 'Starting data synchronization...',
            icon: '/icons/sync.png'
          });
        }
      }
      
      const result = await triggerManualSync();
      
      if (showNotifications && result) {
        // Show completion notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const message = result.successful.length > 0 
            ? `Synced ${result.successful.length} items successfully`
            : 'No items to sync';
            
          new Notification('Sync Complete', {
            body: message,
            icon: '/icons/sync-complete.png'
          });
        }
      }
      
      return result;
    } catch (error) {
      if (showNotifications) {
        // Show error notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Sync Failed', {
            body: 'Data synchronization failed. Please try again.',
            icon: '/icons/sync-error.png'
          });
        }
      }
      throw error;
    }
  }, [triggerManualSync, showNotifications]);
  
  return { triggerSync: triggerWithNotification };
};

// Hook for requesting notification permissions
export const useNotificationPermission = () => {
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }, []);
  
  return {
    permission: 'Notification' in window ? Notification.permission : 'denied',
    requestPermission
  };
};