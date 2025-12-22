'use client';

import React, { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { offlineTileManager } from '@/lib/map/offlineTiles';

interface OfflineTileLayerProps {
  url?: string;
  attribution?: string;
  maxZoom?: number;
  minZoom?: number;
  tileSize?: number;
  className?: string;
  onTileLoadStart?: () => void;
  onTileLoad?: () => void;
  onTileError?: () => void;
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
}

export function OfflineTileLayer({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom = 19,
  minZoom = 0,
  tileSize = 256,
  className,
  onTileLoadStart,
  onTileLoad,
  onTileError,
  onCacheHit,
  onCacheMiss
}: OfflineTileLayerProps) {
  const [tileUrl, setTileUrl] = useState(url);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initialize offline tile manager
    offlineTileManager.initialize();
    
    // Check online status
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Custom tile URL function that handles offline caching
  const getTileUrl = ({ x, y, z }: { x: number; y: number; z: number }) => {
    const baseUrl = url.replace('{s}', 'a').replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    
    onTileLoadStart?.();
    
    // Try to get cached tile
    offlineTileManager.getTile(baseUrl, z, x, y)
      .then((cachedUrl) => {
        if (cachedUrl) {
          onCacheHit?.();
          return cachedUrl;
        } else {
          onCacheMiss?.();
          return baseUrl;
        }
      })
      .catch((error) => {
        console.warn('Error loading tile:', error);
        onTileError?.();
        return baseUrl;
      });
    
    return baseUrl;
  };

  return (
    <TileLayer
      url={tileUrl}
      attribution={attribution}
      maxZoom={maxZoom}
      minZoom={minZoom}
      tileSize={tileSize}
      className={className}
      eventHandlers={{
        tileload: onTileLoad,
        tileerror: onTileError,
      }}
    />
  );
}

export default OfflineTileLayer;