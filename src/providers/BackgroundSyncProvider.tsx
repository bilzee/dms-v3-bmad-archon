'use client'

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useBackgroundSync } from '@/hooks/useBackgroundSync'
import { deliveryOfflineService, DeliveryOfflineService } from '@/lib/services/delivery-offline.service'

interface BackgroundSyncContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSync: Date | null
  forceSync: () => Promise<void>
  syncStats: any
}

const BackgroundSyncContext = createContext<BackgroundSyncContextType | undefined>(undefined)

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStats, setSyncStats] = useState<any>(null)

  // Update online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (online) {
        toast.success('Connection restored', {
          description: 'Offline data will be synced automatically',
          duration: 3000
        })
      } else {
        toast.warning('Connection lost', {
          description: 'Working in offline mode. Data will be synced when connection is restored.',
          duration: 5000
        })
      }
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Update pending count periodically
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await DeliveryOfflineService.getOfflineStats()
      setPendingCount(stats.pendingCount)
      setSyncStats(stats)
    } catch (error) {
      console.error('Failed to update pending count:', error)
    }
  }, [])

  useEffect(() => {
    updatePendingCount()
    
    const interval = setInterval(updatePendingCount, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [updatePendingCount])

  // Background sync setup
  const { isRunning, lastSync, forceSync } = useBackgroundSync({
    enabled: isOnline,
    syncInterval: 60000, // 1 minute
    onSyncComplete: useCallback((results: any) => {
      console.log('Background sync completed:', results)
      
      if (results.synced > 0) {
        toast.success('Data synced', {
          description: `${results.synced} delivery confirmation(s) synced successfully`,
          duration: 4000
        })
        updatePendingCount()
      }
      
      if (results.failed > 0) {
        toast.error('Sync issues', {
          description: `${results.failed} item(s) failed to sync. Will retry automatically.`,
          duration: 6000
        })
      }
    }, [updatePendingCount]),
    onSyncError: useCallback((error: any) => {
      console.error('Background sync error:', error)
      toast.error('Sync failed', {
        description: 'Failed to sync offline data. Will retry automatically.',
        duration: 5000
      })
    }, [])
  })

  // Manual sync handler
  const handleForceSync = useCallback(async () => {
    try {
      await forceSync()
      await updatePendingCount()
      toast.success('Manual sync completed', {
        description: 'All pending data has been synced',
        duration: 3000
      })
    } catch (error) {
      toast.error('Manual sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      })
    }
  }, [forceSync, updatePendingCount])

  const contextValue: BackgroundSyncContextType = {
    isOnline,
    isSyncing: isRunning,
    pendingCount,
    lastSync,
    forceSync: handleForceSync,
    syncStats
  }

  return (
    <BackgroundSyncContext.Provider value={contextValue}>
      {children}
    </BackgroundSyncContext.Provider>
  )
}

export function useBackgroundSyncContext() {
  const context = useContext(BackgroundSyncContext)
  if (context === undefined) {
    throw new Error('useBackgroundSyncContext must be used within a BackgroundSyncProvider')
  }
  return context
}