'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface SafeDataLoaderProps<T> {
  children: (data: T | null, isLoading: boolean, error: string | null, retry: () => void) => ReactNode
  queryFn: () => Promise<T>
  fallbackData?: T
  enabled?: boolean
  retryCount?: number
  showError?: boolean
  showEmptyState?: boolean
  emptyStateMessage?: string
  loadingMessage?: string
  errorTitle?: string
}

interface SafeDataLoaderState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  retryCount: number
}

export function SafeDataLoader<T = any>({
  children,
  queryFn,
  fallbackData = undefined as T,
  enabled = true,
  retryCount: maxRetries = 3,
  showError = true,
  showEmptyState = true,
  emptyStateMessage = "No data available",
  loadingMessage = "Loading...",
  errorTitle = "Error"
}: SafeDataLoaderProps<T>) {
  const [state, setState] = useState<SafeDataLoaderState<T>>({
    data: null,
    isLoading: enabled,
    error: null,
    retryCount: 0
  })

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadData = async (isRetry = false) => {
    if (!enabled) return

    setState(prev => ({
      ...prev,
      isLoading: !isRetry,
      error: isRetry ? prev.error : null
    }))

    try {
      const result = await queryFn()
      setState({
        data: result,
        isLoading: false,
        error: null,
        retryCount: 0
      })
    } catch (error) {
      console.error('SafeDataLoader error:', error)
      
      // Retry logic
      if (state.retryCount < maxRetries) {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1
        }))
        
        // Exponential backoff
        const delay = Math.pow(2, state.retryCount) * 1000
        setTimeout(() => loadData(true), delay)
        return
      }

      // Final error state
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState({
        data: fallbackData,
        isLoading: false,
        error: errorMessage,
        retryCount: 0
      })
    }
  }

  useEffect(() => {
    loadData()
  }, [enabled, queryFn])

  const retry = () => {
    setState(prev => ({ ...prev, error: null, retryCount: 0 }))
    loadData(true)
  }

  // Render fallback components for specific states
  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    )
  }

  if (state.error && showError) {
    const isNetworkError = !isOnline || 
      state.error.toLowerCase().includes('network') ||
      state.error.toLowerCase().includes('fetch')

    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isNetworkError ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span className="font-medium">{errorTitle}</span>
              </div>
              <AlertDescription>
                {isNetworkError ? (
                  <div>
                    <p>Network connection issue. Please check your internet connection.</p>
                    <p className="text-sm mt-1">Error details: {state.error}</p>
                  </div>
                ) : (
                  <div>
                    <p>{state.error}</p>
                    <p className="text-sm mt-1">
                      {state.retryCount === 0 ? 
                        "Please try again or contact support if the problem persists." :
                        `Retrying... (${state.retryCount}/${maxRetries})`
                      }
                    </p>
                  </div>
                )}
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              disabled={!isOnline}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // Empty state handling
  if (showEmptyState && !state.data && !state.error && !state.isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateMessage}</h3>
        <p className="text-sm text-gray-500">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <Button variant="outline" onClick={retry} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  // Main render - pass state and retry function to children
  return (
    <>
      {children(state.data, state.isLoading, state.error, retry)}
    </>
  )
}