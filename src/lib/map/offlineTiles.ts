import Dexie, { Table } from 'dexie';

export interface CachedTile {
  id?: string;
  url: string;
  data: Blob;
  timestamp: number;
  z: number;
  x: number;
  y: number;
  expiresAt: number;
}

export interface TileCacheConfig {
  maxAge: number; // Tile age in milliseconds (default: 7 days)
  maxTiles: number; // Maximum number of tiles to cache (default: 10000)
  tileSize: number; // Tile size in pixels (default: 256)
  zoomLevels: number[]; // Zoom levels to cache (default: 0-15)
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }; // Geographic bounds for caching
}

class OfflineTileDatabase extends Dexie {
  tiles!: Table<CachedTile>;

  constructor() {
    super('DisasterManagementOfflineTiles');
    
    this.version(1).stores({
      tiles: 'id, url, z, x, y, timestamp, expiresAt',
    });
    
    this.tiles.hook('creating', (primKey, obj) => {
      obj.id = `${obj.z}/${obj.x}/${obj.y}`;
    });
  }
}

const tileDb = new OfflineTileDatabase();

export class OfflineTileManager {
  private config: TileCacheConfig;
  private isOnline: boolean;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: Partial<TileCacheConfig> = {}) {
    this.config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxTiles: 10000,
      tileSize: 256,
      zoomLevels: Array.from({ length: 16 }, (_, i) => i), // 0-15
      bounds: {
        north: 13.0, // Northern Nigeria
        south: 4.0,  // Southern Nigeria
        east: 14.0,  // Eastern border
        west: 2.0    // Western border
      },
      ...config
    };
    
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Get tile from cache or fetch from network
   */
  async getTile(url: string, z: number, x: number, y: number): Promise<string | null> {
    const tileKey = `${z}/${x}/${y}`;
    
    try {
      // First try to get from cache
      const cachedTile = await tileDb.tiles.get(tileKey);
      
      if (cachedTile && !this.isTileExpired(cachedTile)) {
        this.cacheHits++;
        return this.blobToDataUrl(cachedTile.data);
      }
      
      // If not in cache or expired, fetch from network
      if (this.isOnline) {
        this.cacheMisses++;
        return this.fetchAndCacheTile(url, z, x, y);
      }
      
      // Offline and no cached tile
      return null;
    } catch (error) {
      console.warn('Error getting tile:', error);
      return null;
    }
  }

  /**
   * Fetch tile from network and cache it
   */
  private async fetchAndCacheTile(url: string, z: number, x: number, y: number): Promise<string | null> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      
      // Cache the tile
      await tileDb.tiles.put({
        url,
        data: blob,
        timestamp: Date.now(),
        z,
        x,
        y,
        expiresAt: Date.now() + this.config.maxAge
      });
      
      // Clean up old tiles if cache is full
      await this.cleanupCache();
      
      return dataUrl;
    } catch (error) {
      console.warn('Error fetching tile:', error);
      return null;
    }
  }

  /**
   * Convert Blob to Data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if tile is expired
   */
  private isTileExpired(tile: CachedTile): boolean {
    return Date.now() > tile.expiresAt;
  }

  /**
   * Clean up old tiles to maintain cache size
   */
  private async cleanupCache(): Promise<void> {
    try {
      const tileCount = await tileDb.tiles.count();
      
      if (tileCount > this.config.maxTiles) {
        // Remove oldest tiles beyond the limit
        const tilesToRemove = await tileDb.tiles
          .orderBy('timestamp')
          .limit(tileCount - this.config.maxTiles)
          .toArray();
        
        const idsToRemove = tilesToRemove.map(tile => tile.id);
        await tileDb.tiles.bulkDelete(idsToRemove);
      }
      
      // Remove expired tiles
      const expiredTiles = await tileDb.tiles
        .where('expiresAt')
        .below(Date.now())
        .toArray();
      
      if (expiredTiles.length > 0) {
        const expiredIds = expiredTiles.map(tile => tile.id);
        await tileDb.tiles.bulkDelete(expiredIds);
      }
    } catch (error) {
      console.warn('Error cleaning up cache:', error);
    }
  }

  /**
   * Preload tiles for a specific area and zoom levels
   */
  async preloadTiles(
    bounds: { north: number; south: number; east: number; west: number },
    zoomLevels: number[],
    tileSize: number = 256,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    if (!this.isOnline) {
      console.warn('Cannot preload tiles: offline');
      return;
    }

    const tilesToLoad: Array<{ z: number; x: number; y: number }> = [];
    
    // Calculate tiles for each zoom level
    for (const z of zoomLevels) {
      const tiles = this.calculateTiles(bounds, z, tileSize);
      tilesToLoad.push(...tiles);
    }

    let loadedCount = 0;
    
    for (const tile of tilesToLoad) {
      const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
      
      try {
        await this.fetchAndCacheTile(url, tile.z, tile.x, tile.y);
        loadedCount++;
        
        onProgress?.(loadedCount, tilesToLoad.length);
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.warn(`Failed to preload tile ${tile.z}/${tile.x}/${tile.y}:`, error);
      }
    }
  }

  /**
   * Calculate tiles needed for a given bounds and zoom level
   */
  private calculateTiles(
    bounds: { north: number; south: number; east: number; west: number },
    z: number,
    tileSize: number
  ): Array<{ z: number; x: number; y: number }> {
    const tiles: Array<{ z: number; x: number; y: number }> = [];
    
    // Convert lat/lng to tile coordinates
    const latToTileY = (lat: number, z: number) => {
      const latRad = lat * Math.PI / 180;
      return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
    };
    
    const lngToTileX = (lng: number, z: number) => {
      return Math.floor((lng + 180) / 360 * Math.pow(2, z));
    };
    
    const minY = latToTileY(bounds.north, z);
    const maxY = latToTileY(bounds.south, z);
    const minX = lngToTileX(bounds.west, z);
    const maxX = lngToTileX(bounds.east, z);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles.push({ z, x, y });
      }
    }
    
    return tiles;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalTiles: number;
    cacheSize: number;
    hitRate: number;
    isOnline: boolean;
  }> {
    const totalTiles = await tileDb.tiles.count();
    
    // Estimate cache size (rough calculation)
    let cacheSize = 0;
    try {
      const tiles = await tileDb.tiles.limit(100).toArray();
      const avgTileSize = tiles.reduce((sum, tile) => sum + tile.data.size, 0) / tiles.length;
      cacheSize = totalTiles * avgTileSize;
    } catch (error) {
      console.warn('Error calculating cache size:', error);
    }
    
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    
    return {
      totalTiles,
      cacheSize,
      hitRate,
      isOnline: this.isOnline
    };
  }

  /**
   * Clear all cached tiles
   */
  async clearCache(): Promise<void> {
    try {
      await tileDb.tiles.clear();
      console.log('Tile cache cleared');
    } catch (error) {
      console.error('Error clearing tile cache:', error);
    }
  }

  /**
   * Check if we should preload tiles for current incident area
   */
  async shouldPreloadForIncident(
    incidentBounds?: { north: number; south: number; east: number; west: number }
  ): Promise<boolean> {
    if (!this.isOnline || !incidentBounds) {
      return false;
    }

    // Check if we have sufficient cached tiles for this area
    const zoomLevels = [10, 11, 12]; // Preload zoom levels 10-12
    let totalTilesNeeded = 0;
    let cachedTiles = 0;

    for (const z of zoomLevels) {
      const tiles = this.calculateTiles(incidentBounds, z, this.config.tileSize);
      totalTilesNeeded += tiles.length;

      for (const tile of tiles) {
        const cachedTile = await tileDb.tiles.get(`${tile.z}/${tile.x}/${tile.y}`);
        if (cachedTile && !this.isTileExpired(cachedTile)) {
          cachedTiles++;
        }
      }
    }

    // Preload if less than 50% of tiles are cached
    const cacheRatio = totalTilesNeeded > 0 ? cachedTiles / totalTilesNeeded : 0;
    return cacheRatio < 0.5;
  }

  /**
   * Initialize offline tile caching for the application
   */
  async initialize(): Promise<void> {
    try {
      // Clean up expired tiles on startup
      await this.cleanupCache();
      
      console.log('Offline tile manager initialized');
    } catch (error) {
      console.error('Error initializing offline tile manager:', error);
    }
  }
}

// Singleton instance
export const offlineTileManager = new OfflineTileManager();

// Custom Leaflet tile layer for offline support
export class OfflineTileLayer {
  private manager: OfflineTileManager;
  private tileSize: number;

  constructor(manager: OfflineTileManager) {
    this.manager = manager;
    this.tileSize = 256;
  }

  /**
   * Create a custom tile URL function for Leaflet
   */
  createTileUrlFunction(): (coords: { z: number; x: number; y: number }) => string {
    return async (coords) => {
      const url = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
      const cachedUrl = await this.manager.getTile(url, coords.z, coords.x, coords.y);
      
      if (cachedUrl) {
        return cachedUrl;
      }
      
      // Return fallback URL (will show loading/error state)
      return url;
    };
  }
}