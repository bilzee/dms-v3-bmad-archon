'use client'

import { useEffect, useRef, useCallback } from 'react'
import { DeliveryOfflineService } from '@/lib/services/delivery-offline.service'

interface UseBackgroundSyncOptions {
  enabled?: boolean
  syncInterval?: number // milliseconds
  onSyncComplete?: (results: any) => void
  onSyncError?: (error: Error) => void
}

export function useBackgroundSync({
  enabled = true,
  syncInterval = 60000, // 1 minute default
  onSyncComplete,
  onSyncError
}: UseBackgroundSyncOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<Date | null>(null)
  const isRunningRef = useRef(false)

  const performSync = useCallback(async () => {
    if (!navigator.onLine || isRunningRef.current) return

    try {
      isRunningRef.current = true
      
      // Check if there are pending operations
      const stats = await DeliveryOfflineService.getOfflineStats()
      if (stats.pendingCount === 0) {
        return // No sync needed
      }

      console.log(`🔄 Background sync: Starting sync for ${stats.pendingCount} pending operations`)
      
      const results = await DeliveryOfflineService.syncPendingOperations()
      lastSyncRef.current = new Date()
      
      console.log('✅ Background sync completed:', results)
      
      if (onSyncComplete) {
        onSyncComplete(results)
      }
      
      // If there were failures, schedule a retry sooner
      if (results.failed > 0) {
        setTimeout(() => {
          if (navigator.onLine && enabled) {
            performSync()
          }
        }, 30000) // 30 seconds
      }
      
    } catch (error) {
      console.error('❌ Background sync failed:', error)
      
      if (onSyncError) {
        onSyncError(error instanceof Error ? error : new Error('Unknown sync error'))
      }
    } finally {
      isRunningRef.current = false
    }
  }, [enabled, onSyncComplete, onSyncError])

  const startSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Initial sync
    performSync()

    // Set up recurring sync
    intervalRef.current = setInterval(() => {
      if (navigator.onLine && enabled) {
        performSync()
      }
    }, syncInterval)
  }, [performSync, syncInterval, enabled])

  const stopSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const forceSync = useCallback(async () => {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }
    
    await performSync()
  }, [performSync])

  // Set up sync when online status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Network connection restored')
      if (enabled) {
        // Delay sync slightly to ensure network is fully ready
        setTimeout(performSync, 1000)
      }
    }

    const handleOffline = () => {
      console.log('📶 Network connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled, performSync])

  // Start/stop sync based on enabled state
  useEffect(() => {
    if (enabled) {
      startSync()
    } else {
      stopSync()
    }

    return stopSync
  }, [enabled, startSync, stopSync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isRunning: isRunningRef.current,
    lastSync: lastSyncRef.current,
    forceSync,
    startSync,
    stopSync
  }
}