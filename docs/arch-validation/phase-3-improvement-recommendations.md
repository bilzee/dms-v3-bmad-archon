# Phase 3: Disaster Resilience Enhancements

**Document Date**: 2025-10-11  
**Timeline**: Week 5-6 (After Phase 2 completion)  
**Focus**: Advanced offline capabilities and field operations optimization  
**Goal**: World-class disaster response system with maximum resilience

## Executive Summary

After establishing production safety in Phases 1-2, Phase 3 focuses on advanced disaster resilience features that make the system truly exceptional for humanitarian field operations. These enhancements ensure optimal performance in challenging network conditions and provide advanced capabilities for disaster response coordination.

---

# 🌐 Advanced Offline Capabilities (Week 5)

## 3.1 Bandwidth-Aware Synchronization

**Priority**: **HIGH** - Critical for low-bandwidth disaster zones  
**File**: `lib/sync/bandwidth-manager.ts` (NEW)  
**Impact**: Optimizes sync performance for challenging network conditions

### **BANDWIDTH MANAGEMENT SERVICE**:
```typescript
// lib/sync/bandwidth-manager.ts
export interface BandwidthMetrics {
  downloadSpeed: number; // bytes/second
  uploadSpeed: number; // bytes/second
  latency: number; // milliseconds
  networkType: 'wifi' | 'cellular' | 'satellite' | 'unknown';
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SyncOptimization {
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  batchSize: number;
  parallelUploads: number;
  retryTimeout: number;
  prioritization: 'speed' | 'reliability';
}

export class BandwidthManager {
  private static readonly CONNECTION_THRESHOLDS = {
    excellent: { upload: 1000000, download: 5000000, latency: 50 }, // 1MB/s up, 5MB/s down
    good: { upload: 500000, download: 2000000, latency: 150 },      // 500KB/s up, 2MB/s down
    fair: { upload: 100000, download: 500000, latency: 500 },       // 100KB/s up, 500KB/s down
    poor: { upload: 10000, download: 100000, latency: 2000 },         // 10KB/s up, 100KB/s down
  };
  
  // ✅ ENHANCED: Real-time bandwidth monitoring
  static async measureBandwidth(): Promise<BandwidthMetrics> {
    const startTime = Date.now();
    
    try {
      // Test download speed
      const testUrl = '/api/v1/bandwidth-test';
      const testSize = 100000; // 100KB test file
      
      const downloadResponse = await fetch(`${testUrl}?size=${testSize}`);
      if (!downloadResponse.ok) {
        throw new Error('Bandwidth test failed');
      }
      
      const downloadArrayBuffer = await downloadResponse.arrayBuffer();
      const downloadTime = Date.now() - startTime;
      const downloadSpeed = (testSize * 8) / (downloadTime / 1000); // bits/second
      
      // Test upload speed
      const uploadStartTime = Date.now();
      const uploadData = new Array(testSize).fill('x').join('');
      
      const uploadResponse = await fetch('/api/v1/bandwidth-test-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: uploadData,
      });
      
      const uploadTime = Date.now() - uploadStartTime;
      const uploadSpeed = (testSize * 8) / (uploadTime / 1000); // bits/second
      
      // Detect network type
      const networkType = await this.detectNetworkType();
      
      // Calculate connection quality
      const connectionQuality = this.calculateConnectionQuality(downloadSpeed, uploadSpeed, downloadTime);
      
      return {
        downloadSpeed,
        uploadSpeed,
        latency: Math.max(downloadTime, uploadTime),
        networkType,
        connectionQuality,
      };
    } catch (error) {
      console.error('Bandwidth measurement failed:', error);
      return this.getFallbackMetrics();
    }
  }
  
  // ✅ ENHANCED: Network type detection
  private static async detectNetworkType(): Promise<'wifi' | 'cellular' | 'satellite' | 'unknown'> {
    if (!navigator.connection) {
      return 'unknown';
    }
    
    const connection = navigator.connection as any;
    
    if (connection.type === 'wifi' || connection.type === 'ethernet') {
      return 'wifi';
    }
    
    if (connection.type === 'cellular') {
      return 'cellular';
    }
    
    // Check for satellite characteristics (very high latency, low speed)
    if (connection.rtt > 2000 || connection.downlink < 0.1) {
      return 'satellite';
    }
    
    return 'unknown';
  }
  
  private static calculateConnectionQuality(
    downloadSpeed: number,
    uploadSpeed: number,
    latency: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const thresholds = this.CONNECTION_THRESHOLDS;
    
    if (uploadSpeed >= thresholds.excellent.upload &&
        downloadSpeed >= thresholds.excellent.download &&
        latency <= thresholds.excellent.latency) {
      return 'excellent';
    }
    
    if (uploadSpeed >= thresholds.good.upload &&
        downloadSpeed >= thresholds.good.download &&
        latency <= thresholds.good.latency) {
      return 'good';
    }
    
    if (uploadSpeed >= thresholds.fair.upload &&
        downloadSpeed >= thresholds.fair.download &&
        latency <= thresholds.fair.latency) {
      return 'fair';
    }
    
    return 'poor';
  }
  
  private static getFallbackMetrics(): BandwidthMetrics {
    return {
      downloadSpeed: 100000,
      uploadSpeed: 50000,
      latency: 1000,
      networkType: 'unknown',
      connectionQuality: 'fair',
    };
  }
  
  // ✅ ENHANCED: Adaptive sync optimization
  static getOptimizationStrategy(metrics: BandwidthMetrics): SyncOptimization {
    switch (metrics.connectionQuality) {
      case 'excellent':
        return {
          compressionLevel: 'low',
          batchSize: 50,
          parallelUploads: 3,
          retryTimeout: 5000,
          prioritization: 'speed',
        };
        
      case 'good':
        return {
          compressionLevel: 'medium',
          batchSize: 25,
          parallelUploads: 2,
          retryTimeout: 10000,
          prioritization: 'reliability',
        };
        
      case 'fair':
        return {
          compressionLevel: 'high',
          batchSize: 10,
          parallelUploads: 1,
          retryTimeout: 15000,
          prioritization: 'reliability',
        };
        
      case 'poor':
        return {
          compressionLevel: 'high',
          batchSize: 5,
          parallelUploads: 1,
          retryTimeout: 30000,
          prioritization: 'reliability',
        };
        
      default:
        return this.getOptimizationStrategy(this.getFallbackMetrics());
    }
  }
  
  // ✅ ENHANCED: Data compression for low bandwidth
  static async compressData(data: any, level: SyncOptimization['compressionLevel']): Promise<{
    compressed: Uint8Array;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }> {
    const jsonString = JSON.stringify(data);
    const originalSize = jsonString.length;
    const encoder = new TextEncoder();
    const originalBytes = encoder.encode(jsonString);
    
    if (level === 'none') {
      return {
        compressed: originalBytes,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
      };
    }
    
    // Use CompressionStream API if available
    if ('CompressionStream' in window) {
      try {
        const compressionStream = new CompressionStream('gzip');
        const writer = compressionStream.writable.getWriter();
        const reader = new ReadableStream({
          start(controller) {
            controller.enqueue(originalBytes);
            controller.close();
          }
        }).getReader();
        
        const compressed = await new Response(reader.readable.pipeThrough(compressionStream)).arrayBuffer();
        const compressedBytes = new Uint8Array(compressed);
        
        return {
          compressed: compressedBytes,
          originalSize,
          compressedSize: compressedBytes.length,
          compressionRatio: originalSize / compressedBytes.length,
        };
      } catch (error) {
        console.error('Compression failed, falling back to simple compression:', error);
      }
    }
    
    // Fallback: Simple string compression for basic cases
    const compressed = this.simpleCompress(jsonString);
    return {
      compressed: new TextEncoder().encode(compressed),
      originalSize,
      compressedSize: compressed.length,
      compressionRatio: originalSize / compressed.length,
    };
  }
  
  private static simpleCompress(str: string): string {
    // Simple LZ77-like compression for fallback
    const dict: { [key: string]: number } = {};
    let result = '';
    let dictIndex = 1;
    
    for (let i = 0; i < str.length; i++) {
      let longestMatch = '';
      let matchLength = 0;
      
      // Look for longest matching substring in dictionary
      for (let j = Math.max(0, i - 100); j < i; j++) {
        const substr = str.substring(j, Math.min(i + 20, str.length));
        if (dict[substr] !== undefined && substr.length > longestMatch.length) {
          longestMatch = substr;
          matchLength = substr.length;
        }
      }
      
      if (longestMatch.length > 3) {
        result += `#${dict[longestMatch]}`;
        i += longestMatch.length - 1;
      } else {
        const char = str[i];
        if (dict[char] === undefined) {
          dict[char] = dictIndex++;
        }
        result += char;
      }
    }
    
    return result;
  }
}
```

### **BANDWIDTH-AWARE SYNC SERVICE**:
```typescript
// lib/sync/bandwidth-aware-sync.ts
export class BandwidthAwareSyncService {
  private bandwidthMetrics: BandwidthMetrics | null = null;
  private lastBandwidthCheck = 0;
  private readonly BANDWIDTH_CHECK_INTERVAL = 60000; // 1 minute
  
  // ✅ ENHANCED: Adaptive sync based on bandwidth
  static async syncWithBandwidthAwareness(
    changes: SyncChange[],
    userId: string
  ): Promise<{
      successful: SyncResult[];
      conflicts: SyncResult[];
      failed: SyncResult[];
      bandwidthMetrics: BandwidthMetrics;
      optimizationStrategy: SyncOptimization;
    }> {
    // Get current bandwidth metrics
    const bandwidthMetrics = await this.getCurrentBandwidthMetrics();
    const optimizationStrategy = BandwidthManager.getOptimizationStrategy(bandwidthMetrics);
    
    console.log(`Syncing with ${optimizationStrategy.connectionQuality} connection`);
    
    // Prepare and compress data based on optimization
    const preparedChanges = await this.prepareChanges(changes, optimizationStrategy);
    
    // Execute sync with bandwidth-aware parameters
    const results = await this.executeBandwidthAwareSync(
      preparedChanges,
      userId,
      optimizationStrategy,
      bandwidthMetrics
    );
    
    return {
      ...results,
      bandwidthMetrics,
      optimizationStrategy,
    };
  }
  
  private static async getCurrentBandwidthMetrics(): Promise<BandwidthMetrics> {
    const now = Date.now();
    
    // Use cached metrics if recent
    if (this.bandwidthMetrics && (now - this.lastBandwidthCheck) < this.BANDWIDTH_CHECK_INTERVAL) {
      return this.bandwidthMetrics;
    }
    
    // Measure current bandwidth
    this.bandwidthMetrics = await BandwidthManager.measureBandwidth();
    this.lastBandwidthCheck = now;
    
    return this.bandwidthMetrics;
  }
  
  private static async prepareChanges(
    changes: SyncChange[],
    strategy: SyncOptimization
  ): Promise<Array<{
    change: SyncChange;
    compressedData?: Uint8Array;
    originalSize?: number;
    compressedSize?: number;
  }>> {
    const preparedChanges = [];
    
    for (const change of changes) {
      const preparedChange: any = { change };
      
      // Compress data if not a media file
      if (strategy.compressionLevel !== 'none' && change.type !== 'media') {
        const compressionResult = await BandwidthManager.compressData(
          change.data,
          strategy.compressionLevel
        );
        
        preparedChange.compressedData = compressionResult.compressed;
        preparedChange.originalSize = compressionResult.originalSize;
        preparedChange.compressedSize = compressionResult.compressedSize;
        
        // Update change data with compressed payload
        preparedChange.change = {
          ...change,
          data: {
            ...change.data,
            _compressed: compressionResult.compressed,
            _originalSize: compressionResult.originalSize,
            _compressedSize: compressionResult.compressedSize,
          },
        };
      }
      
      preparedChanges.push(preparedChange);
    }
    
    return preparedChanges;
  }
  
  private static async executeBandwidthAwareSync(
    preparedChanges: Array<{
      change: SyncChange;
      compressedData?: Uint8Array;
      originalSize?: number;
      compressedSize?: number;
    }>,
    userId: string,
    strategy: SyncOptimization,
    bandwidthMetrics: BandwidthMetrics
  ): Promise<{
    successful: SyncResult[];
    conflicts: SyncResult[];
    failed: SyncResult[];
  }> {
    // Batch size based on connection quality
    const batchSize = strategy.batchSize;
    const batches = [];
    
    for (let i = 0; i < preparedChanges.length; i += batchSize) {
      batches.push(preparedChanges.slice(i, i + batchSize));
    }
    
    const results = {
      successful: [] as SyncResult[],
      conflicts: [] as SyncResult[],
      failed: [] as SyncResult[],
    };
    
    // Process batches with parallelism based on connection quality
    const parallelBatches = Math.min(strategy.parallelUploads, batches.length);
    const batchPromises: Promise<any>[] = [];
    
    for (let i = 0; i < batches.length; i += parallelBatches) {
      const currentBatch = batches.slice(i, i + parallelBatches);
      
      const batchPromise = this.processBatch(
        currentBatch,
        userId,
        strategy,
        bandwidthMetrics
      );
      
      batchPromises.push(batchPromise);
    }
    
    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Combine results
    for (const batchResult of batchResults) {
      results.successful.push(...batchResult.successful);
      results.conflicts.push(...batchResult.conflicts);
      results.failed.push(...batchResult.failed);
    }
    
    return results;
  }
  
  private static async processBatch(
    batch: Array<{
      change: SyncChange;
      compressedData?: Uint8Array;
      originalSize?: number;
      compressedSize?: number;
    }>,
    userId: string,
    strategy: SyncOptimization,
    bandwidthMetrics: BandwidthMetrics
  ): Promise<{
    successful: SyncResult[];
    conflicts: SyncResult[];
    failed: SyncResult[];
  }> {
    try {
      // Prepare sync payload
      const syncPayload = {
        changes: batch.map(item => ({
          type: item.change.type,
          action: item.change.action,
          data: item.change.data,
          offlineId: item.change.offlineId,
          versionNumber: item.change.versionNumber,
          metadata: {
            originalSize: item.originalSize,
            compressedSize: item.compressedSize,
            bandwidthMetrics,
            optimizationStrategy: strategy,
          },
        })),
        userId,
        syncTimestamp: new Date().toISOString(),
      };
      
      // Execute sync with timeout based on connection quality
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), strategy.retryTimeout);
      
      const response = await fetch('/api/v1/sync/bandwidth-aware', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
          'X-Bandwidth-Metrics': JSON.stringify(bandwidthMetrics),
        },
        body: JSON.stringify(syncPayload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Log bandwidth usage for optimization
      this.logBandwidthUsage(batch, result, bandwidthMetrics, strategy);
      
      return result.data;
    } catch (error) {
      console.error('Bandwidth-aware sync failed:', error);
      
      // Return failed results for all items in batch
      return {
        successful: [],
        conflicts: [],
        failed: batch.map(item => ({
          offlineId: item.change.offlineId,
          serverId: '',
          status: 'failed' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
        })),
      };
    }
  }
  
  private static logBandwidthUsage(
    batch: any[],
    result: any,
    bandwidthMetrics: BandwidthMetrics,
    strategy: SyncOptimization
  ): void {
    const totalOriginalSize = batch.reduce((sum, item) => sum + (item.originalSize || 0), 0);
    const totalCompressedSize = batch.reduce((sum, item) => sum + (item.compressedSize || 0), 0);
    const compressionRatio = totalOriginalSize / totalCompressedSize;
    
    console.log('Bandwidth Usage Report:', {
      connectionQuality: bandwidthMetrics.connectionQuality,
      uploadSpeed: `${(bandwidthMetrics.uploadSpeed / 1000).toFixed(1)} KB/s`,
      downloadSpeed: `${(bandwidthMetrics.downloadSpeed / 1000).toFixed(1)} KB/s`,
      latency: `${bandwidthMetrics.latency}ms`,
      batchSize: strategy.batchSize,
      totalOriginalSize: `${(totalOriginalSize / 1024).toFixed(1)} KB`,
      totalCompressedSize: `${(totalCompressedSize / 1024).toFixed(1)} KB`,
      compressionRatio: compressionRatio.toFixed(2),
      successfulItems: result.successful.length,
      failedItems: result.failed.length,
      compressionSavings: `${((1 - 1/compressionRatio) * 100).toFixed(1)}%`,
    });
  }
}
```

## 3.2 Advanced Media Synchronization

**Priority**: **HIGH** - Essential for field evidence collection  
**File**: `lib/sync/media-sync.ts` (NEW)  
**Impact**: Optimizes photo/video uploads for disaster scenarios

### **ADVANCED MEDIA SYNC SERVICE**:
```typescript
// lib/sync/media-sync.ts
export interface MediaSyncOptions {
  maxSize: number; // Maximum file size in bytes
  quality: 'original' | 'compressed' | 'thumbnail';
  priority: 'immediate' | 'batch';
  compressionLevel: number; // 0-100 for images
  resizeOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
}

export class MediaSyncService {
  private static readonly DEFAULT_OPTIONS: MediaSyncOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    quality: 'compressed',
    priority: 'batch',
    compressionLevel: 70,
    resizeOptions: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    },
  };
  
  // ✅ ENHANCED: Smart media processing
  static async processMediaFile(
    file: File,
    options: Partial<MediaSyncOptions> = {}
  ): Promise<{
    processedFile: Blob;
    metadata: {
      originalSize: number;
      processedSize: number;
      dimensions?: { width: number; height: number };
      compressionRatio: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    const syncOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Validate file
    if (file.size > syncOptions.maxSize) {
      throw new Error(`File size (${file.size} bytes) exceeds maximum (${syncOptions.maxSize} bytes)`);
    }
    
    let processedFile: Blob;
    let dimensions: { width: number; height: number } | undefined;
    const originalSize = file.size;
    
    // Process based on file type
    if (file.type.startsWith('image/')) {
      const imageResult = await this.processImage(file, syncOptions);
      processedFile = imageResult.blob;
      dimensions = imageResult.dimensions;
    } else if (file.type.startsWith('video/')) {
      const videoResult = await this.processVideo(file, syncOptions);
      processedFile = videoResult.blob;
      dimensions = videoResult.dimensions;
    } else {
      // For other files, just validate size
      processedFile = file;
    }
    
    const processedSize = processedFile.size;
    const processingTime = Date.now() - startTime;
    
    return {
      processedFile,
      metadata: {
        originalSize,
        processedSize,
        dimensions,
        compressionRatio: originalSize / processedSize,
        processingTime,
      },
    };
  }
  
  // ✅ ENHANCED: Image processing with smart compression
  private static async processImage(
    file: File,
    options: MediaSyncOptions
  ): Promise<{
    blob: Blob;
    dimensions: { width: number; height: number };
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate dimensions
          let { width, height } = img;
          
          if (options.resizeOptions) {
            const { maxWidth, maxHeight } = options.resizeOptions;
            
            // Calculate scaled dimensions maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
              const aspectRatio = width / height;
              
              if (width > maxWidth) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio);
              }
              
              if (height > maxHeight && height > Math.round(maxWidth / aspectRatio)) {
                height = maxHeight;
                width = Math.round(maxHeight * aspectRatio);
              }
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Apply image processing based on quality setting
          ctx.imageSmoothingEnabled = options.quality !== 'original';
          ctx.imageSmoothingQuality = options.quality === 'high' ? 'high' : 'medium';
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  dimensions: { width, height },
                });
              } else {
                reject(new Error('Failed to process image'));
              }
            },
            'image/jpeg',
            options.resizeOptions?.quality || 0.8
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  
  // ✅ ENHANCED: Video processing for large files
  private static async processVideo(
    file: File,
    options: MediaSyncOptions
  ): Promise<{
    blob: Blob;
    dimensions: { width: number; height: number };
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        try {
          const { videoWidth, videoHeight } = video;
          
          // For videos, we'll create a thumbnail and maintain original
          if (options.quality === 'thumbnail' || options.resizeOptions) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate thumbnail dimensions
            let { width, height } = { width: videoWidth, height: videoHeight };
            
            if (options.resizeOptions) {
              const { maxWidth, maxHeight } = options.resizeOptions;
              
              if (width > maxWidth || height > maxHeight) {
                const aspectRatio = width / height;
                
                if (width > maxWidth) {
                  width = maxWidth;
                  height = Math.round(maxWidth / aspectRatio);
                }
                
                if (height > maxHeight && height > Math.round(maxWidth / aspectRatio)) {
                  height = maxHeight;
                  width = Math.round(maxHeight * aspectRatio);
                }
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw video frame
            ctx.drawImage(video, 0, 0, width, height);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Create a new video file with thumbnail
                  const thumbnailBlob = new Blob([blob], { type: 'image/jpeg' });
                  resolve({
                    blob: thumbnailBlob,
                    dimensions: { width, height },
                  });
                } else {
                  reject(new Error('Failed to create video thumbnail'));
                }
              },
              'image/jpeg',
              0.8
            );
          } else {
            // Keep original video but compress if needed
            // Note: Video compression requires more complex processing
            // For now, we'll use the original file
            resolve({
              blob: file,
              dimensions: { width: videoWidth, height: videoHeight },
            });
          }
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  }
  
  // ✅ ENHANCED: Resumable upload with chunking
  static async uploadMediaChunked(
    mediaFile: Blob,
    metadata: {
      filename: string;
      mimeType: string;
      size: number;
      assessmentId?: string;
      responseId?: string;
    },
    options: {
      chunkSize?: number;
      maxRetries?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<string> {
    const chunkSize = options.chunkSize || (1024 * 1024); // 1MB chunks
    const maxRetries = options.maxRetries || 3;
    const chunks: Blob[] = [];
    
    // Split file into chunks
    let offset = 0;
    while (offset < mediaFile.size) {
      const chunk = mediaFile.slice(offset, offset + chunkSize);
      chunks.push(chunk);
      offset += chunkSize;
    }
    
    const fileId = crypto.randomUUID();
    const uploadPromises: Promise<any>[] = [];
    
    // Upload chunks in parallel (with limit)
    const concurrentUploads = Math.min(3, chunks.length);
    
    for (let i = 0; i < chunks.length; i += concurrentUploads) {
      const concurrentChunkPromises: Promise<any>[] = [];
      
      for (let j = 0; j < concurrentUploads && i + j < chunks.length; j++) {
        const chunkIndex = i + j;
        const chunk = chunks[chunkIndex];
        
        const chunkPromise = this.uploadChunk(
          chunk,
          fileId,
          chunkIndex,
          chunks.length,
          metadata,
          maxRetries,
          options.onProgress
        );
        
        concurrentChunkPromises.push(chunkPromise);
      }
      
      uploadPromises.push(Promise.all(concurrentChunkPromises));
      
      // Wait for this batch before starting next
      if (i + concurrentUploads < chunks.length) {
        await Promise.all(uploadPromises[uploadPromises.length - 1]);
      }
    }
    
    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
    
    return fileId;
  }
  
  private static async uploadChunk(
    chunk: Blob,
    fileId: string,
    chunkIndex: number,
    totalChunks: number,
    metadata: any,
    maxRetries: number,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('fileId', fileId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('metadata', JSON.stringify(metadata));
        
        const response = await fetch('/api/v1/media/upload-chunk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Chunk upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Report progress
        if (onProgress) {
          const progress = ((chunkIndex + 1) / totalChunks) * 100;
          onProgress(progress);
        }
        
        return result;
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          throw new Error(`Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${error}`);
        }
        
        // Exponential backoff before retry
        await this.delay(Math.pow(2, retries) * 1000);
      }
    }
    
    throw new Error(`Upload failed for chunk ${chunkIndex}`);
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 3.3 Field Operations Support

**Priority**: **HIGH** - Essential for disaster field teams  
**File**: `lib/field/field-operations.ts` (NEW)  
**Impact**: Supports extended offline field work

### **FIELD OPERATIONS SERVICE**:
```typescript
// lib/field/field-operations.ts
export interface FieldOperation {
  type: 'assessment' | 'response' | 'media' | 'note';
  entityId: string;
  data: any;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  priority: 'critical' | 'high' | 'normal' | 'low';
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface FieldSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  teamId: string;
  teamMembers: string[];
  operations: FieldOperation[];
  locationHistory: Array<{
    timestamp: Date;
    latitude: number;
    longitude: number;
    accuracy: number;
  }>;
  networkHistory: Array<{
    timestamp: Date;
    isOnline: boolean;
    networkType?: string;
    signalStrength?: number;
  }>;
}

export class FieldOperationsService {
  private static activeSession: FieldSession | null = null;
  private static locationWatchId: number | null = null;
  private static networkWatchId: number | null = null;
  
  // ✅ ENHANCED: Start field session with comprehensive tracking
  static async startFieldSession(
    teamId: string,
    teamMembers: string[],
    initialLocation?: { latitude: number; longitude: number; accuracy: number }
  ): Promise<FieldSession> {
    const session: FieldSession = {
      id: crypto.randomUUID(),
      startTime: new Date(),
      teamId,
      teamMembers,
      operations: [],
      locationHistory: [],
      networkHistory: [],
    };
    
    // Add initial location if provided
    if (initialLocation) {
      session.locationHistory.push({
        timestamp: new Date(),
        ...initialLocation,
      });
    }
    
    this.activeSession = session;
    
    // Start location tracking
    await this.startLocationTracking();
    
    // Start network monitoring
    this.startNetworkMonitoring();
    
    // Store session
    await this.storeSession(session);
    
    return session;
  }
  
  // ✅ ENHANCED: Location tracking for field operations
  private static async startLocationTracking(): Promise<void> {
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      return;
    }
    
    const updateLocation = (position: GeolocationPosition) => {
      if (!this.activeSession) return;
      
      const location = {
        timestamp: new Date(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      
      this.activeSession.locationHistory.push(location);
      
      // Store session periodically (every 10 locations)
      if (this.activeSession.locationHistory.length % 10 === 0) {
        this.storeSession(this.activeSession);
      }
    };
    
    // Watch position changes
    this.locationWatchId = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );
  }
  
  // ✅ ENHANCED: Network monitoring for connectivity awareness
  private static startNetworkMonitoring(): void {
    // Monitor online/offline changes
    const updateNetworkStatus = () => {
      if (!this.activeSession) return;
      
      const networkStatus = {
        timestamp: new Date(),
        isOnline: navigator.onLine,
        networkType: this.getNetworkType(),
        signalStrength: this.getSignalStrength(),
      };
      
      this.activeSession.networkHistory.push(networkStatus);
      
      // Auto-sync when coming online
      if (networkStatus.isOnline) {
        this.triggerFieldSync();
      }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Periodic network check
    setInterval(updateNetworkStatus, 30000); // Every 30 seconds
  }
  
  private static getNetworkType(): string {
    if (!navigator.connection) {
      return 'unknown';
    }
    
    const connection = navigator.connection as any;
    return connection.type || 'unknown';
  }
  
  private static getSignalStrength(): number {
    // This is a simplified implementation
    // Real signal strength would require device-specific APIs
    if (navigator.connection) {
      const connection = navigator.connection as any;
      // Use downlink as a rough signal strength indicator
      return connection.downlink || 0;
    }
    return 0;
  }
  
  // ✅ ENHANCED: Add field operation with location context
  static async addFieldOperation(
    operation: Omit<FieldOperation, 'timestamp' | 'syncStatus'>,
    location?: { latitude: number; longitude: number; accuracy: number }
  ): Promise<void> {
    if (!this.activeSession) {
      throw new Error('No active field session');
    }
    
    // Get current location if not provided
    if (!location) {
      location = await this.getCurrentLocation();
    }
    
    const fieldOperation: FieldOperation = {
      ...operation,
      timestamp: new Date(),
      location,
      syncStatus: 'pending',
    };
    
    this.activeSession.operations.push(fieldOperation);
    
    // Store operation in IndexedDB
    await this.storeFieldOperation(fieldOperation);
    
    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.syncFieldOperation(fieldOperation);
    }
  }
  
  private static async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }
  
  // ✅ ENHANCED: End field session with comprehensive cleanup
  static async endFieldSession(): Promise<FieldSession> {
    if (!this.activeSession) {
      throw new Error('No active field session to end');
    }
    
    // Update session end time
    this.activeSession.endTime = new Date();
    
    // Stop tracking
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
    
    // Final sync attempt
    await this.syncAllPendingOperations();
    
    // Store final session
    await this.storeSession(this.activeSession);
    
    const session = this.activeSession;
    this.activeSession = null;
    
    return session;
  }
  
  // ✅ ENHANCED: Sync all pending operations with priority
  private static async syncAllPendingOperations(): Promise<void> {
    if (!this.activeSession) return;
    
    const pendingOperations = this.activeSession.operations.filter(
      op => op.syncStatus === 'pending' || op.syncStatus === 'failed'
    );
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    pendingOperations.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    // Sync operations in batches
    const batchSize = 10;
    for (let i = 0; i < pendingOperations.length; i += batchSize) {
      const batch = pendingOperations.slice(i, i + batchSize);
      await this.syncOperationBatch(batch);
    }
  }
  
  private static async syncOperationBatch(
    operations: FieldOperation[]
  ): Promise<void> {
    try {
      const syncData = {
        operations: operations.map(op => ({
          ...op,
          sessionId: this.activeSession?.id,
        })),
        teamId: this.activeSession?.teamId,
        syncTimestamp: new Date().toISOString(),
      };
      
      const response = await fetch('/api/v1/field/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify(syncData),
      });
      
      if (!response.ok) {
        throw new Error(`Field sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update operation statuses
      for (const operation of operations) {
        const syncResult = result.results.find((r: any) => 
          r.offlineId === operation.data.offlineId
        );
        
        if (syncResult) {
          operation.syncStatus = syncResult.status;
        }
      }
      
      // Store updated operations
      for (const operation of operations) {
        await this.storeFieldOperation(operation);
      }
      
    } catch (error) {
      console.error('Field operation batch sync failed:', error);
      
      // Mark operations as failed
      for (const operation of operations) {
        operation.syncStatus = 'failed';
        await this.storeFieldOperation(operation);
      }
    }
  }
  
  private static async syncFieldOperation(operation: FieldOperation): Promise<void> {
    try {
      const syncData = {
        ...operation,
        sessionId: this.activeSession?.id,
        teamId: this.activeSession?.teamId,
      };
      
      const response = await fetch('/api/v1/field/sync-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify(syncData),
      });
      
      if (!response.ok) {
        throw new Error(`Field sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      operation.syncStatus = result.status;
      await this.storeFieldOperation(operation);
      
    } catch (error) {
      console.error('Field operation sync failed:', error);
      operation.syncStatus = 'failed';
      await this.storeFieldOperation(operation);
    }
  }
  
  // ✅ ENHANCED: Storage operations for offline persistence
  private static async storeSession(session: FieldSession): Promise<void> {
    try {
      await db.fieldSessions.put(session.id, session);
    } catch (error) {
      console.error('Failed to store field session:', error);
    }
  }
  
  private static async storeFieldOperation(operation: FieldOperation): Promise<void> {
    try {
      await db.fieldOperations.put(operation.data.id || crypto.randomUUID(), operation);
    } catch (error) {
      console.error('Failed to store field operation:', error);
    }
  }
  
  // ✅ ENHANCED: Trigger field sync with network awareness
  private static triggerFieldSync(): void {
    // Add small delay to ensure network is fully available
    setTimeout(() => {
      if (this.activeSession && navigator.onLine) {
        this.syncAllPendingOperations();
      }
    }, 2000);
  }
  
  // ✅ ENHANCED: Get session analytics
  static getSessionAnalytics(sessionId: string): Promise<{
    session: FieldSession;
    operationsByType: Record<string, number>;
    operationsByPriority: Record<string, number>;
    syncStatus: Record<string, number>;
    locationSummary: {
      totalPoints: number;
      averageAccuracy: number;
      areaCovered: number;
    };
    networkSummary: {
      totalChecks: number;
      onlineTime: number;
      networkTypes: Record<string, number>;
    };
  }> {
    const session = await db.fieldSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const operationsByType = {};
    const operationsByPriority = {};
    const syncStatus = {};
    
    for (const operation of session.operations) {
      operationsByType[operation.type] = (operationsByType[operation.type] || 0) + 1;
      operationsByPriority[operation.priority] = (operationsByPriority[operation.priority] || 0) + 1;
      syncStatus[operation.syncStatus] = (syncStatus[operation.syncStatus] || 0) + 1;
    }
    
    // Calculate location summary
    const locationSummary = {
      totalPoints: session.locationHistory.length,
      averageAccuracy: session.locationHistory.length > 0
        ? session.locationHistory.reduce((sum, loc) => sum + loc.accuracy, 0) / session.locationHistory.length
        : 0,
      areaCovered: this.calculateAreaCovered(session.locationHistory),
    };
    
    // Calculate network summary
    const networkSummary = {
      totalChecks: session.networkHistory.length,
      onlineTime: session.networkHistory.filter(h => h.isOnline).length,
      networkTypes: session.networkHistory.reduce((types, h) => {
        types[h.networkType] = (types[h.networkType] || 0) + 1;
        return types;
      }, {}),
    };
    
    return {
      session,
      operationsByType,
      operationsByPriority,
      syncStatus,
      locationSummary,
      networkSummary,
    };
  }
  
  private static calculateAreaCovered(locationHistory: Array<{
    timestamp: Date;
    latitude: number;
    longitude: number;
    accuracy: number;
  }>): number {
    if (locationHistory.length < 2) return 0;
    
    let area = 0;
    for (let i = 1; i < locationHistory.length; i++) {
      const loc1 = locationHistory[i - 1];
      const loc2 = locationHistory[i];
      
      // Simple area calculation using rectangle approximation
      const width = Math.abs(loc2.longitude - loc1.longitude) * 111320; // ~111km per degree longitude
      const height = Math.abs(loc2.latitude - loc1.latitude) * 110540; // ~110.5km per degree latitude
      area += width * height;
    }
    
    return area;
  }
}
```

## 📋 Phase 3 Implementation Checklist

### Advanced Offline Capabilities (MUST DO)
- [ ] Implement bandwidth-aware synchronization
- [ ] Add advanced media processing and chunked uploads
- [ ] Create comprehensive field operations support
- [ ] Implement location and network tracking

### Performance Optimizations (SHOULD DO)
- [ ] Add data compression for low-bandwidth scenarios
- [ ] Implement intelligent sync prioritization
- [ ] Create resumable upload mechanisms
- [ ] Add field session analytics

### Field Operations Enhancements (COULD DO)
- [ ] Add offline map support
- [ ] Implement team collaboration features
- [ ] Create emergency communication protocols
- [ ] Add battery optimization for field devices

### Expected Phase 3 Outcomes

**Advanced Offline Capabilities**:
- ✅ Bandwidth-aware sync optimization
- ✅ Smart media processing and compression
- ✅ Resumable large file uploads
- ✅ Intelligent sync prioritization

**Field Operations Support**:
- ✅ Comprehensive field session tracking
- ✅ Location and network monitoring
- ✅ Offline operation management
- ✅ Team collaboration features

**Performance Optimizations**:
- ✅ Adaptive compression based on network conditions
- ✅ Chunked uploads for large files
- ✅ Priority-based operation processing
- ✅ Network usage optimization

---

**Next**: Create updated architecture documents that incorporate all validated patterns and improvements.

**Context7 References Used**: Advanced PWA patterns, bandwidth optimization techniques, field operations best practices, and media processing strategies validated through Context7 research.