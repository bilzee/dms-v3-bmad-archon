import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DownloadProgress {
  id: string;
  filename: string;
  size?: number;
  downloaded?: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress?: number; // 0-100
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  url?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DownloadState {
  downloads: Record<string, DownloadProgress>;
  activeDownloads: string[];
  downloadHistory: DownloadProgress[];
  
  // Settings
  defaultDownloadPath?: string;
  concurrentLimit: number;
  autoRetryAttempts: number;
  autoRetryDelay: number; // seconds
  
  // Actions
  startDownload: (url: string, filename: string, options?: DownloadOptions) => Promise<void>;
  pauseDownload: (downloadId: string) => void;
  resumeDownload: (downloadId: string) => void;
  cancelDownload: (downloadId: string) => void;
  retryDownload: (downloadId: string) => void;
  removeDownload: (downloadId: string) => void;
  clearCompletedDownloads: () => void;
  clearAllDownloads: () => void;
  getDownloadProgress: (downloadId: string) => DownloadProgress | undefined;
  updateDownloadProgress: (downloadId: string, progress: Partial<DownloadProgress>) => void;
  
  // Export-specific downloads
  downloadExport: (exportId: string, downloadUrl: string, filename: string) => Promise<void>;
  downloadBatchExports: (exportIds: string[]) => Promise<void>;
  
  // UI helpers
  formatFileSize: (bytes?: number) => string;
  formatSpeed: (bytesPerSecond?: number) => string;
  formatTime: (seconds?: number) => string;
}

export interface DownloadOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // seconds
  onProgress?: (progress: number, downloaded: number, total: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
  concurrent?: boolean; // Allow concurrent downloads
}

class DownloadManager {
  private downloadQueue: string[] = [];
  private activeRequests: Map<string, AbortController> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private progressIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private get: () => DownloadState, private set: any) {}

  async startDownload(url: string, filename: string, options: DownloadOptions = {}): Promise<void> {
    const state = this.get();
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check concurrent limit
    const canStartConcurrent = options.concurrent || state.activeDownloads.length < state.concurrentLimit;
    const shouldQueue = !canStartConcurrent && state.activeDownloads.length >= state.concurrentLimit;

    if (shouldQueue) {
      this.downloadQueue.push(downloadId);
    }

    // Create download record
    const downloadRecord: DownloadProgress = {
      id: downloadId,
      filename,
      status: shouldQueue ? 'pending' : 'downloading',
      progress: shouldQueue ? 0 : undefined,
      createdAt: new Date(),
      url,
    };

    this.set((state) => ({
      downloads: {
        ...state.downloads,
        [downloadId]: downloadRecord,
      },
      activeDownloads: shouldQueue ? state.activeDownloads : [...state.activeDownloads, downloadId],
      downloadHistory: [downloadRecord, ...state.downloadHistory.slice(0, 49)], // Keep last 50
    }));

    if (shouldQueue) {
      return; // Wait for queue processing
    }

    await this.executeDownload(downloadId, url, filename, options);
  }

  private async executeDownload(downloadId: string, url: string, filename: string, options: DownloadOptions): Promise<void> {
    const controller = new AbortController();
    this.activeRequests.set(downloadId, controller);

    try {
      // Initial fetch to get file size
      const headResponse = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: options.headers,
      });

      const contentLength = headResponse.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength, 10) : undefined;

      // Update download with file size
      this.updateDownloadProgress(downloadId, {
        size: fileSize,
      });

      // Start actual download
      const response = await fetch(url, {
        method: options.method || 'GET',
        signal: controller.signal,
        headers: {
          ...options.headers,
          // Add range header for resume support if supported
          ...(options.headers?.Range ? {} : { Range: 'bytes=0-' }),
        },
        body: options.body,
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText} (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : fileSize;

      let downloaded = 0;
      let lastProgressUpdate = Date.now();
      const chunks: Uint8Array[] = [];

      // Update status to downloading
      this.updateDownloadProgress(downloadId, {
        status: 'downloading',
        progress: 0,
        downloaded: 0,
        size: totalSize,
      });

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        if (controller.signal.aborted) {
          throw new Error('Download cancelled');
        }

        chunks.push(value);
        downloaded += value.length;

        // Update progress every 100ms
        const now = Date.now();
        if (now - lastProgressUpdate > 100) {
          const progress = totalSize ? (downloaded / totalSize) * 100 : 0;
          const elapsed = (now - lastProgressUpdate) / 1000;
          const speed = downloaded / elapsed;
          const remaining = speed > 0 && totalSize ? (totalSize - downloaded) / speed : undefined;

          this.updateDownloadProgress(downloadId, {
            progress,
            downloaded,
            speed,
            estimatedTimeRemaining: remaining,
          });

          if (options.onProgress) {
            options.onProgress(progress, downloaded, totalSize || 0);
          }

          lastProgressUpdate = now;
        }
      }

      // Complete download
      const blob = new Blob(chunks);
      this.completeDownload(downloadId, blob, options);

    } catch (error) {
      if (error instanceof Error && error.message === 'Download cancelled') {
        this.updateDownloadProgress(downloadId, {
          status: 'cancelled',
          completedAt: new Date(),
        });
      } else {
        this.handleDownloadError(downloadId, error as Error, options);
      }
    } finally {
      this.activeRequests.delete(downloadId);
      this.processQueue();
    }
  }

  private completeDownload(downloadId: string, blob: Blob, options: DownloadOptions): void {
    // Create download URL
    const downloadUrl = URL.createObjectURL(blob);

    // Update download record
    this.updateDownloadProgress(downloadId, {
      status: 'completed',
      progress: 100,
      downloaded: blob.size,
      size: blob.size,
      downloadUrl,
      speed: 0,
      estimatedTimeRemaining: 0,
      completedAt: new Date(),
    });

    // Trigger browser download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = this.get().downloads[downloadId]?.filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up URL after delay
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 5000);

    // Call completion callback
    if (options.onComplete) {
      options.onComplete(blob);
    }
  }

  private handleDownloadError(downloadId: string, error: Error, options: DownloadOptions): void {
    const state = this.get();
    const download = state.downloads[downloadId];
    
    // Check if we should retry
    const retryAttempts = options.retryAttempts || state.autoRetryAttempts;
    const currentAttempt = this.getRetryAttempt(downloadId);
    
    if (currentAttempt < retryAttempts) {
      // Schedule retry
      const retryDelay = (options.retryDelay || state.autoRetryDelay) * 1000;
      const nextAttempt = currentAttempt + 1;
      
      this.setRetryAttempt(downloadId, nextAttempt);
      
      const timeout = setTimeout(() => {
        this.updateDownloadProgress(downloadId, {
          status: 'downloading',
          progress: 0,
          error: undefined,
        });
        
        // Retry the download (this would need the original URL)
        if (download.url) {
          this.executeDownload(downloadId, download.url, download.filename, options);
        }
      }, retryDelay);
      
      this.retryTimeouts.set(downloadId, timeout);
      
      this.updateDownloadProgress(downloadId, {
        status: 'downloading',
        error: `Retrying... Attempt ${nextAttempt} of ${retryAttempts}`,
      });
      
      return;
    }

    // Final failure
    this.updateDownloadProgress(downloadId, {
      status: 'error',
      error: error.message,
      completedAt: new Date(),
    });

    // Call error callback
    if (options.onError) {
      options.onError(error);
    }
  }

  private getRetryAttempt(downloadId: string): number {
    const state = this.get();
    const download = state.downloads[downloadId];
    // Store retry attempt in error message or use a separate tracking mechanism
    const errorMatch = download?.error?.match(/Attempt (\d+) of/);
    return errorMatch ? parseInt(errorMatch[1]) : 0;
  }

  private setRetryAttempt(downloadId: string, attempt: number): void {
    // This is a simplified retry tracking
    // In production, use proper state management
  }

  private processQueue(): void {
    const state = this.get();
    
    if (this.downloadQueue.length > 0 && state.activeDownloads.length < state.concurrentLimit) {
      const nextDownloadId = this.downloadQueue.shift();
      if (nextDownloadId) {
        const download = state.downloads[nextDownloadId];
        if (download?.url) {
          this.updateDownloadProgress(nextDownloadId, {
            status: 'downloading',
            error: undefined,
          });
          
          this.executeDownload(nextDownloadId, download.url, download.filename, {});
        }
      }
    }
  }

  pauseDownload(downloadId: string): void {
    const controller = this.activeRequests.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(downloadId);
    }

    this.updateDownloadProgress(downloadId, {
      status: 'pending',
    });
  }

  resumeDownload(downloadId: string): void {
    const download = this.get().downloads[downloadId];
    if (download?.url && download.status === 'pending') {
      this.updateDownloadProgress(downloadId, {
        status: 'downloading',
        error: undefined,
      });
      
      this.executeDownload(downloadId, download.url, download.filename, {});
    }
  }

  cancelDownload(downloadId: string): void {
    // Clear any pending retry
    const retryTimeout = this.retryTimeouts.get(downloadId);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      this.retryTimeouts.delete(downloadId);
    }

    // Clear progress interval
    const progressInterval = this.progressIntervals.get(downloadId);
    if (progressInterval) {
      clearInterval(progressInterval);
      this.progressIntervals.delete(downloadId);
    }

    // Abort active request
    const controller = this.activeRequests.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(downloadId);
    }

    // Remove from queue
    const queueIndex = this.downloadQueue.indexOf(downloadId);
    if (queueIndex !== -1) {
      this.downloadQueue.splice(queueIndex, 1);
    }

    this.updateDownloadProgress(downloadId, {
      status: 'cancelled',
      completedAt: new Date(),
    });

    // Update active downloads
    this.set((state) => ({
      activeDownloads: state.activeDownloads.filter(id => id !== downloadId),
    }));
  }

  retryDownload(downloadId: string): void {
    const download = this.get().downloads[downloadId];
    if (download?.url && download.status === 'error') {
      this.updateDownloadProgress(downloadId, {
        status: 'downloading',
        progress: 0,
        error: undefined,
      });
      
      this.executeDownload(downloadId, download.url, download.filename, {});
    }
  }

  removeDownload(downloadId: string): void {
    this.cancelDownload(downloadId);
    
    this.set((state) => {
      const updatedDownloads = { ...state.downloads };
      delete updatedDownloads[downloadId];
      
      return {
        downloads: updatedDownloads,
        activeDownloads: state.activeDownloads.filter(id => id !== downloadId),
        downloadHistory: state.downloadHistory.filter(d => d.id !== downloadId),
      };
    });
  }

  clearCompletedDownloads(): void {
    const state = this.get();
    const completedIds = Object.entries(state.downloads)
      .filter(([_, download]) => download.status === 'completed')
      .map(([id]) => id);

    this.set((state) => ({
      downloads: Object.fromEntries(
        Object.entries(state.downloads).filter(([id]) => !completedIds.includes(id))
      ),
      downloadHistory: state.downloadHistory.filter(d => !completedIds.includes(d.id)),
    }));
  }

  clearAllDownloads(): void {
    // Cancel all active downloads
    this.get().activeDownloads.forEach(downloadId => {
      this.cancelDownload(downloadId);
    });

    this.set((state) => ({
      downloads: {},
      activeDownloads: [],
      downloadHistory: [],
    }));
  }

  getDownloadProgress(downloadId: string): DownloadProgress | undefined {
    return this.get().downloads[downloadId];
  }

  updateDownloadProgress(downloadId: string, progress: Partial<DownloadProgress>): void {
    this.set((state) => ({
      downloads: {
        ...state.downloads,
        [downloadId]: {
          ...state.downloads[downloadId],
          ...progress,
        },
      },
    }));
  }

  // Export-specific download methods
  async downloadExport(exportId: string, downloadUrl: string, filename: string): Promise<void> {
    return this.startDownload(downloadUrl, filename, {
      onProgress: (progress, downloaded, total) => {
        // Update export store if needed
        this.updateDownloadProgress(exportId, {
          progress,
          downloaded,
          size: total,
        });
      },
      onComplete: (blob) => {
        this.updateDownloadProgress(exportId, {
          status: 'completed',
          completedAt: new Date(),
        });
      },
      onError: (error) => {
        this.updateDownloadProgress(exportId, {
          status: 'error',
          error: error.message,
          completedAt: new Date(),
        });
      },
    });
  }

  async downloadBatchExports(exportIds: string[]): Promise<void> {
    // Create zip file with multiple exports
    // This would require additional libraries like JSZip
    const downloadPromises = exportIds.map(async (exportId) => {
      const download = this.get().downloads[exportId];
      if (download?.downloadUrl && download.status === 'completed') {
        return this.startDownload(download.downloadUrl, download.filename, {
          concurrent: true,
        });
      }
    });

    await Promise.allSettled(downloadPromises);
  }

  // UI utility methods
  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
  }

  formatSpeed(bytesPerSecond?: number): string {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  formatTime(seconds?: number): string {
    if (!seconds || seconds <= 0) return '--';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

export const useDownloadStore = create<DownloadState>()(
  devtools(
    (set, get) => {
      const downloadManager = new DownloadManager(get, set);

      return {
        // Initial state
        downloads: {},
        activeDownloads: [],
        downloadHistory: [],
        concurrentLimit: 3,
        autoRetryAttempts: 2,
        autoRetryDelay: 5,

        // Download actions
        startDownload: downloadManager.startDownload.bind(downloadManager),
        pauseDownload: downloadManager.pauseDownload.bind(downloadManager),
        resumeDownload: downloadManager.resumeDownload.bind(downloadManager),
        cancelDownload: downloadManager.cancelDownload.bind(downloadManager),
        retryDownload: downloadManager.retryDownload.bind(downloadManager),
        removeDownload: downloadManager.removeDownload.bind(downloadManager),
        clearCompletedDownloads: downloadManager.clearCompletedDownloads.bind(downloadManager),
        clearAllDownloads: downloadManager.clearAllDownloads.bind(downloadManager),
        getDownloadProgress: downloadManager.getDownloadProgress.bind(downloadManager),
        updateDownloadProgress: downloadManager.updateDownloadProgress.bind(downloadManager),

        // Export-specific actions
        downloadExport: downloadManager.downloadExport.bind(downloadManager),
        downloadBatchExports: downloadManager.downloadBatchExports.bind(downloadManager),

        // UI helpers
        formatFileSize: downloadManager.formatFileSize.bind(downloadManager),
        formatSpeed: downloadManager.formatSpeed.bind(downloadManager),
        formatTime: downloadManager.formatTime.bind(downloadManager),
      };
    },
    {
      name: 'download-store',
      partialize: (state) => ({
        downloads: state.downloads,
        activeDownloads: state.activeDownloads,
        downloadHistory: state.downloadHistory,
      }),
    }
  )
);

// Selectors
export const useActiveDownloads = () => useDownloadStore((state) => 
  state.activeDownloads.map(id => state.downloads[id]).filter(Boolean)
);

export const useCompletedDownloads = () => useDownloadStore((state) => 
  Object.values(state.downloads).filter(download => download.status === 'completed')
);

export const useDownloadingCount = () => useDownloadStore((state) => 
  state.activeDownloads.length
);