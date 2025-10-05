import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncEngine, ConnectivityStatus, SyncBatchResult } from '@/lib/sync/engine';
import { queueManager, QueueItemStatus, QueueMetrics } from '@/lib/sync/queue';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  syncInProgress: boolean;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  syncProgress: number;
  syncMessage?: string;
  connectionType?: string;
  effectiveType?: string;
}

export interface SyncError {
  id: string;
  message: string;
  type: 'network' | 'conflict' | 'validation' | 'server' | 'unknown';
  timestamp: Date;
  entityType?: string;
  entityUuid?: string;
  dismissed: boolean;
}

interface SyncState {
  // Connection and sync status
  status: SyncStatus;
  
  // Queue management
  queueItems: QueueItemStatus[];
  queueMetrics: QueueMetrics | null;
  
  // Error tracking
  errors: SyncError[];
  
  // Settings
  autoSync: boolean;
  syncInterval: number; // minutes
  retryOnFailure: boolean;
  showSyncNotifications: boolean;
  
  // Actions - Status Management
  updateStatus: (status: Partial<SyncStatus>) => void;
  setConnectivity: (connectivity: ConnectivityStatus) => void;
  setSyncProgress: (progress: number, message?: string) => void;
  
  // Actions - Sync Operations
  triggerManualSync: () => Promise<SyncBatchResult | null>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  retryFailedItems: () => Promise<void>;
  clearFailedItems: () => Promise<number>;
  
  // Actions - Queue Management
  refreshQueue: () => Promise<void>;
  removeQueueItem: (uuid: string) => Promise<boolean>;
  prioritizeItem: (uuid: string, priority: number) => Promise<boolean>;
  
  // Actions - Error Management
  addError: (error: Omit<SyncError, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<Pick<SyncState, 'autoSync' | 'syncInterval' | 'retryOnFailure' | 'showSyncNotifications'>>) => void;
  
  // Initialization
  initialize: () => Promise<void>;
  cleanup: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        isSyncing: false,
        syncInProgress: false,
        syncProgress: 0
      },
      queueItems: [],
      queueMetrics: null,
      errors: [],
      autoSync: true,
      syncInterval: 5, // 5 minutes
      retryOnFailure: true,
      showSyncNotifications: true,

      // Status Management
      updateStatus: (statusUpdate: Partial<SyncStatus>) => {
        set((state) => ({
          status: { ...state.status, ...statusUpdate }
        }));
      },

      setConnectivity: (connectivity: ConnectivityStatus) => {
        const statusUpdate: Partial<SyncStatus> = {
          isOnline: connectivity.isOnline,
          connectionType: connectivity.connectionType,
          effectiveType: connectivity.effectiveType
        };

        set((state) => ({
          status: { ...state.status, ...statusUpdate }
        }));

        // Auto-sync when coming online if enabled
        if (connectivity.isOnline && get().autoSync && !get().status.syncInProgress) {
          get().triggerManualSync().catch(error => {
            get().addError({
              message: 'Auto-sync failed when coming online',
              type: 'network'
            });
          });
        }
      },

      setSyncProgress: (progress: number, message?: string) => {
        set((state) => ({
          status: {
            ...state.status,
            syncProgress: Math.max(0, Math.min(100, progress)),
            syncMessage: message
          }
        }));
      },

      // Sync Operations
      triggerManualSync: async (): Promise<SyncBatchResult | null> => {
        const state = get();
        
        if (!state.status.isOnline) {
          get().addError({
            message: 'Cannot sync while offline',
            type: 'network'
          });
          return null;
        }

        if (state.status.syncInProgress) {
          console.log('Sync already in progress');
          return null;
        }

        try {
          // Update status
          get().updateStatus({
            syncInProgress: true,
            isSyncing: true,
            lastSyncAttempt: new Date(),
            syncMessage: 'Starting sync...'
          });

          get().setSyncProgress(10, 'Preparing sync...');

          // Trigger sync
          const result = await syncEngine.triggerSync();

          get().setSyncProgress(90, 'Processing results...');

          if (result) {
            // Process results
            if (result.failed.length > 0) {
              get().addError({
                message: `${result.failed.length} items failed to sync`,
                type: 'server'
              });
            }

            if (result.conflicts.length > 0) {
              get().addError({
                message: `${result.conflicts.length} conflicts were resolved automatically`,
                type: 'conflict'
              });
            }

            // Update status
            get().updateStatus({
              lastSuccessfulSync: new Date(),
              syncMessage: `Synced ${result.successful.length} items successfully`
            });
          }

          get().setSyncProgress(100, 'Sync completed');

          // Refresh queue
          await get().refreshQueue();

          return result;

        } catch (error) {
          console.error('Manual sync failed:', error);
          get().addError({
            message: error instanceof Error ? error.message : 'Manual sync failed',
            type: 'unknown'
          });
          return null;
        } finally {
          // Reset sync status
          setTimeout(() => {
            get().updateStatus({
              syncInProgress: false,
              isSyncing: false,
              syncProgress: 0,
              syncMessage: undefined
            });
          }, 1000);
        }
      },

      startAutoSync: () => {
        set({ autoSync: true });
        console.log('Auto-sync enabled');
      },

      stopAutoSync: () => {
        set({ autoSync: false });
        console.log('Auto-sync disabled');
      },

      retryFailedItems: async (): Promise<void> => {
        try {
          const resetCount = await queueManager.resetFailedItems();
          
          if (resetCount > 0) {
            console.log(`Reset ${resetCount} failed items for retry`);
            await get().refreshQueue();
            
            if (get().status.isOnline && get().autoSync) {
              await get().triggerManualSync();
            }
          }
        } catch (error) {
          console.error('Failed to retry failed items:', error);
          get().addError({
            message: 'Failed to retry failed items',
            type: 'unknown'
          });
        }
      },

      clearFailedItems: async (): Promise<number> => {
        try {
          const clearedCount = await queueManager.clearFailedItems();
          
          if (clearedCount > 0) {
            console.log(`Cleared ${clearedCount} failed items`);
            await get().refreshQueue();
          }
          
          return clearedCount;
        } catch (error) {
          console.error('Failed to clear failed items:', error);
          get().addError({
            message: 'Failed to clear failed items',
            type: 'unknown'
          });
          return 0;
        }
      },

      // Queue Management
      refreshQueue: async (): Promise<void> => {
        try {
          const [items, metrics] = await Promise.all([
            queueManager.getItems({ limit: 100, sortBy: 'priority', sortOrder: 'desc' }),
            queueManager.getMetrics()
          ]);

          set({
            queueItems: items,
            queueMetrics: metrics
          });
        } catch (error) {
          console.error('Failed to refresh queue:', error);
          get().addError({
            message: 'Failed to refresh sync queue',
            type: 'unknown'
          });
        }
      },

      removeQueueItem: async (uuid: string): Promise<boolean> => {
        try {
          const success = await queueManager.removeItem(uuid);
          
          if (success) {
            await get().refreshQueue();
          }
          
          return success;
        } catch (error) {
          console.error('Failed to remove queue item:', error);
          return false;
        }
      },

      prioritizeItem: async (uuid: string, priority: number): Promise<boolean> => {
        try {
          const success = await queueManager.prioritizeItem(uuid, priority);
          
          if (success) {
            await get().refreshQueue();
          }
          
          return success;
        } catch (error) {
          console.error('Failed to prioritize item:', error);
          return false;
        }
      },

      // Error Management
      addError: (error: Omit<SyncError, 'id' | 'timestamp' | 'dismissed'>) => {
        const newError: SyncError = {
          ...error,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          dismissed: false
        };

        set((state) => ({
          errors: [newError, ...state.errors].slice(0, 50) // Keep last 50 errors
        }));

        console.warn('Sync error:', newError.message);
      },

      dismissError: (errorId: string) => {
        set((state) => ({
          errors: state.errors.map(error =>
            error.id === errorId ? { ...error, dismissed: true } : error
          )
        }));
      },

      clearErrors: () => {
        set({ errors: [] });
      },

      // Settings
      updateSettings: (settings) => {
        set((state) => ({
          ...state,
          ...settings
        }));
      },

      // Initialization
      initialize: async (): Promise<void> => {
        try {
          console.log('Initializing sync store...');

          // Set up connectivity listener
          const unsubscribe = syncEngine.onConnectivityChange((status) => {
            get().setConnectivity(status);
          });

          // Store the unsubscribe function for cleanup
          (get() as any)._connectivityUnsubscribe = unsubscribe;

          // Get initial connectivity status
          const initialStatus = syncEngine.getConnectivityStatus();
          get().setConnectivity(initialStatus);

          // Refresh queue
          await get().refreshQueue();

          console.log('Sync store initialized successfully');
        } catch (error) {
          console.error('Failed to initialize sync store:', error);
          get().addError({
            message: 'Failed to initialize sync system',
            type: 'unknown'
          });
        }
      },

      cleanup: () => {
        // Clean up connectivity listener
        const unsubscribe = (get() as any)._connectivityUnsubscribe;
        if (unsubscribe) {
          unsubscribe();
        }
        
        console.log('Sync store cleaned up');
      }
    }),
    {
      name: 'sync-store',
      partialize: (state) => ({
        autoSync: state.autoSync,
        syncInterval: state.syncInterval,
        retryOnFailure: state.retryOnFailure,
        showSyncNotifications: state.showSyncNotifications,
        status: {
          lastSyncAttempt: state.status.lastSyncAttempt,
          lastSuccessfulSync: state.status.lastSuccessfulSync
        }
      }),
    }
  )
);

// Helper hooks for common use cases
export const useSyncStatus = () => {
  return useSyncStore((state) => state.status);
};

export const useSyncQueue = () => {
  return useSyncStore((state) => ({
    items: state.queueItems,
    metrics: state.queueMetrics,
    refreshQueue: state.refreshQueue,
    removeItem: state.removeQueueItem,
    prioritizeItem: state.prioritizeItem
  }));
};

export const useSyncErrors = () => {
  return useSyncStore((state) => ({
    errors: state.errors.filter(error => !error.dismissed),
    allErrors: state.errors,
    addError: state.addError,
    dismissError: state.dismissError,
    clearErrors: state.clearErrors
  }));
};

export const useSyncActions = () => {
  return useSyncStore((state) => ({
    triggerManualSync: state.triggerManualSync,
    retryFailedItems: state.retryFailedItems,
    clearFailedItems: state.clearFailedItems,
    startAutoSync: state.startAutoSync,
    stopAutoSync: state.stopAutoSync
  }));
};