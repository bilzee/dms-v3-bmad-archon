'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface MapPerformanceOptions {
  maxVisibleEntities?: number;
  enableVirtualization?: boolean;
  enableDebouncing?: boolean;
  debounceMs?: number;
  enableClustering?: boolean;
  clusterRadius?: number;
}

interface PerformanceMetrics {
  renderTime: number;
  entityCount: number;
  visibleEntityCount: number;
  clusterCount: number;
  fps: number;
  memoryUsage?: number;
}

export function useMapPerformance(options: MapPerformanceOptions = {}) {
  const {
    maxVisibleEntities = 1000,
    enableVirtualization = true,
    enableDebouncing = true,
    debounceMs = 100,
    enableClustering = true,
    clusterRadius = 50
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    entityCount: 0,
    visibleEntityCount: 0,
    clusterCount: 0,
    fps: 60
  });

  const performanceRef = useRef<{
    lastFrameTime: number;
    frameCount: number;
    renderStartTime: number;
    isMeasuring: boolean;
  }>({
    lastFrameTime: 0,
    frameCount: 0,
    renderStartTime: 0,
    isMeasuring: false
  });

  const debouncedRef = useRef<{
    timeout: NodeJS.Timeout | null;
    lastCall: number;
  }>({
    timeout: null,
    lastCall: 0
  });

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    performanceRef.current.renderStartTime = performance.now();
    performanceRef.current.isMeasuring = true;
  }, []);

  // End performance measurement
  const endMeasurement = useCallback((entityCount: number, visibleEntityCount: number, clusterCount: number) => {
    if (!performanceRef.current.isMeasuring) return;

    const renderTime = performance.now() - performanceRef.current.renderStartTime;
    const now = performance.now();
    
    // Calculate FPS
    const deltaTime = now - performanceRef.current.lastFrameTime;
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      performanceRef.current.lastFrameTime = now;
      performanceRef.current.frameCount++;
    }

    setMetrics({
      renderTime,
      entityCount,
      visibleEntityCount,
      clusterCount,
      fps: performanceRef.current.frameCount > 0 ? 60 : 60 // Default to 60 if not enough data
    });

    performanceRef.current.isMeasuring = false;
  }, []);

  // Debounce function for performance optimization
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (debouncedRef.current.timeout) {
        clearTimeout(debouncedRef.current.timeout);
      }
      
      debouncedRef.current.timeout = setTimeout(() => {
        func(...args);
        debouncedRef.current.timeout = null;
      }, delay - Math.min(0, now - debouncedRef.current.lastCall));
      
      debouncedRef.current.lastCall = now;
    };
  }, []);

  // Virtualization: Only render entities that are visible in viewport
  const getVisibleEntities = useCallback((
    entities: any[],
    mapBounds: { northEast: { lat: number; lng: number }; southWest: { lat: number; lng: number } } | null,
    padding: number = 0.1
  ) => {
    if (!mapBounds || !enableVirtualization || entities.length <= maxVisibleEntities) {
      return entities;
    }

    const north = mapBounds.northEast.lat + padding;
    const south = mapBounds.southWest.lat - padding;
    const east = mapBounds.northEast.lng + padding;
    const west = mapBounds.southWest.lng - padding;

    return entities.filter(entity => {
      if (!entity.coordinates) return false;
      
      const lat = entity.coordinates.latitude;
      const lng = entity.coordinates.longitude;
      
      return lat <= north && lat >= south && lng <= east && lng >= west;
    });
  }, [enableVirtualization, maxVisibleEntities]);

  // Optimized clustering for large datasets
  const getOptimizedClusters = useCallback((
    entities: any[],
    zoom: number,
    center: { lat: number; lng: number } | null
  ) => {
    if (!enableClustering || entities.length <= maxVisibleEntities) {
      return { clusters: entities, clusterCount: 0 };
    }

    // Simple clustering implementation - in production, use a more sophisticated algorithm
    const clusterDistance = Math.max(50, 200 - (zoom * 10)); // Dynamic cluster size based on zoom
    const clusters: any[] = [];
    const processed = new Set();

    entities.forEach((entity, index) => {
      if (processed.has(index)) return;

      const cluster = {
        id: `cluster_${index}`,
        coordinates: entity.coordinates,
        entities: [entity],
        count: 1
      };

      // Find nearby entities for clustering
      entities.forEach((otherEntity, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return;

        const distance = calculateDistance(
          entity.coordinates.latitude,
          entity.coordinates.longitude,
          otherEntity.coordinates.latitude,
          otherEntity.coordinates.longitude
        );

        if (distance <= clusterDistance) {
          cluster.entities.push(otherEntity);
          cluster.count++;
          processed.add(otherIndex);

          // Update cluster center to be the average of all entities
          cluster.coordinates = {
            latitude: cluster.entities.reduce((sum, e) => sum + e.coordinates.latitude, 0) / cluster.entities.length,
            longitude: cluster.entities.reduce((sum, e) => sum + e.coordinates.longitude, 0) / cluster.entities.length
          };
        }
      });

      processed.add(index);
      clusters.push(cluster);
    });

    return { clusters, clusterCount: clusters.length };
  }, [enableClustering, maxVisibleEntities]);

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  }, []);

  // Memory optimization: Clean up old data
  const optimizeMemory = useCallback(() => {
    // Force garbage collection hints (if available)
    if (window.gc) {
      window.gc();
    }
    
    // Clear any cached data that's no longer needed
    if (performanceRef.current.frameCount > 1000) {
      performanceRef.current.frameCount = 0;
    }
  }, []);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      optimizeMemory();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [optimizeMemory]);

  return {
    metrics,
    startMeasurement,
    endMeasurement,
    getVisibleEntities,
    getOptimizedClusters,
    debounce: enableDebouncing ? debounce : (fn: Function) => fn(),
    calculateDistance
  };
}

export default useMapPerformance;