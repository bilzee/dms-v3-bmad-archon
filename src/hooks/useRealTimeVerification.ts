import { useEffect, useRef, useCallback } from 'react';
import { useVerificationStore } from '@/stores/verification.store';

interface UseRealTimeVerificationOptions {
  enabled?: boolean;
  interval?: number;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void;
  onDataUpdate?: (type: 'assessments' | 'deliveries' | 'all') => void;
}

export function useRealTimeVerification({
  enabled = true,
  interval = 30000, // 30 seconds
  onConnectionChange,
  onDataUpdate
}: UseRealTimeVerificationOptions = {}) {
  const {
    refreshAll,
    refreshAssessments,
    refreshDeliveries,
    setConnectionStatus,
    updateLastUpdate,
    isRealTimeEnabled
  } = useVerificationStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const lastSuccessfulUpdate = useRef<string | null>(null);

  // Polling function
  const pollUpdates = useCallback(async () => {
    if (!enabled || !isRealTimeEnabled) return;

    try {
      setConnectionStatus('connecting');
      
      await refreshAll();
      
      setConnectionStatus('connected');
      updateLastUpdate();
      lastSuccessfulUpdate.current = new Date().toISOString();
      retryCountRef.current = 0;
      
      onDataUpdate?.('all');
      onConnectionChange?.('connected');
      
    } catch (error) {
      console.error('Real-time update failed:', error);
      
      retryCountRef.current++;
      
      if (retryCountRef.current >= maxRetries) {
        setConnectionStatus('error');
        onConnectionChange?.('error');
        
        // Exponential backoff for retries
        const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current - maxRetries), 30000);
        setTimeout(pollUpdates, backoffTime);
      } else {
        setConnectionStatus('disconnected');
        onConnectionChange?.('disconnected');
      }
    }
  }, [enabled, isRealTimeEnabled, refreshAll, setConnectionStatus, updateLastUpdate, onDataUpdate, onConnectionChange]);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial poll
    pollUpdates();

    // Set up interval
    intervalRef.current = setInterval(pollUpdates, interval);
  }, [pollUpdates, interval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual refresh
  const manualRefresh = useCallback(async (type?: 'assessments' | 'deliveries') => {
    try {
      setConnectionStatus('connecting');
      
      if (type === 'assessments') {
        await refreshAssessments();
      } else if (type === 'deliveries') {
        await refreshDeliveries();
      } else {
        await refreshAll();
      }
      
      setConnectionStatus('connected');
      updateLastUpdate();
      onDataUpdate?.(type || 'all');
      
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setConnectionStatus('error');
      onConnectionChange?.('error');
    }
  }, [refreshAssessments, refreshDeliveries, refreshAll, setConnectionStatus, updateLastUpdate, onDataUpdate, onConnectionChange]);

  // WebSocket connection for real-time configuration updates
  const connectWebSocket = useCallback(() => {
    // Check if we have authentication and WebSocket support
    if (typeof WebSocket === 'undefined') {
      console.log('WebSocket not supported - using polling fallback');
      return null;
    }

    try {
      // Create WebSocket connection
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:3000/api/v1/verification/live'
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/verification/live`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for real-time verification updates');
        setConnectionStatus('connected');
        onConnectionChange?.('connected');
        
        // Subscribe to configuration changes
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          channels: ['configuration_changes', 'verification_updates'],
          timestamp: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle different message types
          switch (message.event) {
            case 'CONFIGURATION_CHANGED':
            case 'BULK_CONFIGURATION_UPDATED':
              // Refresh verification data when configuration changes
              refreshAll();
              onDataUpdate?.('all');
              break;
              
            case 'VERIFICATION_QUEUE_UPDATED':
              refreshAll();
              onDataUpdate?.('all');
              break;
              
            default:
              console.log('Unhandled WebSocket message:', message);
          }
          
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        onConnectionChange?.('disconnected');
        
        // Fall back to polling
        setTimeout(() => {
          if (enabled && isRealTimeEnabled) {
            startPolling();
          }
        }, 1000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onConnectionChange?.('error');
      };

      return ws;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }, [enabled, isRealTimeEnabled, refreshAll, setConnectionStatus, onConnectionChange, onDataUpdate, startPolling]);

  // Check if we should use WebSocket or polling
  const shouldUseWebSocket = useCallback(() => {
    // Check browser support for WebSocket
    if (typeof WebSocket !== 'undefined') {
      // Could add additional checks here (network conditions, user preferences, etc.)
      return true;
    }
    return false;
  }, []);

  // Initialize real-time updates
  useEffect(() => {
    if (!enabled || !isRealTimeEnabled) {
      stopPolling();
      return;
    }

    if (shouldUseWebSocket()) {
      // Try WebSocket first
      const ws = connectWebSocket();
      if (!ws) {
        // Fall back to polling
        startPolling();
      }
    } else {
      // Use polling
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, isRealTimeEnabled, shouldUseWebSocket, connectWebSocket, startPolling, stopPolling]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        if (enabled && isRealTimeEnabled) {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isRealTimeEnabled, startPolling, stopPolling]);

  // Handle network connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      if (enabled && isRealTimeEnabled) {
        startPolling();
      }
    };

    const handleOffline = () => {
      stopPolling();
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, isRealTimeEnabled, startPolling, stopPolling, setConnectionStatus]);

  return {
    // Status
    isConnected: useVerificationStore(state => state.connectionStatus) === 'connected',
    connectionStatus: useVerificationStore(state => state.connectionStatus),
    lastUpdate: useVerificationStore(state => state.lastUpdate),
    
    // Actions
    manualRefresh,
    refreshAssessments: () => manualRefresh('assessments'),
    refreshDeliveries: () => manualRefresh('deliveries'),
    
    // Configuration
    enabled: enabled && isRealTimeEnabled,
    interval,
    
    // Utilities
    startPolling,
    stopPolling,
    
    // Connection info
    retryCount: retryCountRef.current,
    maxRetries,
    lastSuccessfulUpdate: lastSuccessfulUpdate.current
  };
}

// Hook for connection status monitoring
export function useConnectionStatus() {
  const connectionStatus = useVerificationStore(state => state.connectionStatus);
  const lastUpdate = useVerificationStore(state => state.lastUpdate);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-orange-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  }, []);

  const getLastUpdateText = useCallback((updateTime: string | null) => {
    if (!updateTime) return 'Never';
    
    const now = new Date();
    const update = new Date(updateTime);
    const diffMs = now.getTime() - update.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  return {
    status: connectionStatus,
    lastUpdate,
    statusColor: getStatusColor(connectionStatus),
    statusText: getStatusText(connectionStatus),
    lastUpdateText: getLastUpdateText(lastUpdate),
    isConnected: connectionStatus === 'connected'
  };
}

// Hook for performance metrics
export function useVerificationMetrics() {
  const assessmentMetrics = useVerificationStore(state => state.assessmentMetrics);
  const deliveryMetrics = useVerificationStore(state => state.deliveryMetrics);
  const assessmentQueueDepth = useVerificationStore(state => state.assessmentQueueDepth);
  const deliveryQueueDepth = useVerificationStore(state => state.deliveryQueueDepth);

  const getCombinedMetrics = useCallback(() => {
    const totalPending = (assessmentQueueDepth?.total || 0) + (deliveryQueueDepth?.total || 0);
    const totalCritical = (assessmentQueueDepth?.critical || 0) + (deliveryQueueDepth?.critical || 0);
    const totalHigh = (assessmentQueueDepth?.high || 0) + (deliveryQueueDepth?.high || 0);
    const averageWaitTime = Math.max(assessmentMetrics.averageWaitTime, deliveryMetrics.averageWaitTime);
    const verificationRate = (assessmentMetrics.verificationRate + deliveryMetrics.verificationRate) / 2;

    return {
      totalPending,
      critical: totalCritical,
      high: totalHigh,
      medium: (assessmentQueueDepth?.medium || 0) + (deliveryQueueDepth?.medium || 0),
      low: (assessmentQueueDepth?.low || 0) + (deliveryQueueDepth?.low || 0),
      averageWaitTime,
      verificationRate,
      oldestPending: assessmentMetrics.oldestPending && deliveryMetrics.oldestPending
        ? new Date(Math.max(new Date(assessmentMetrics.oldestPending).getTime(), new Date(deliveryMetrics.oldestPending).getTime())).toISOString()
        : assessmentMetrics.oldestPending || deliveryMetrics.oldestPending
    };
  }, [assessmentMetrics, deliveryMetrics, assessmentQueueDepth, deliveryQueueDepth]);

  return {
    assessments: assessmentMetrics,
    deliveries: deliveryMetrics,
    assessmentQueueDepth: assessmentQueueDepth || { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    deliveryQueueDepth: deliveryQueueDepth || { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    combined: getCombinedMetrics()
  };
}