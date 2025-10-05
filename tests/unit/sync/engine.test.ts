import { SyncEngine, ConnectivityStatus, SyncBatchResult } from '@/lib/sync/engine';
import { offlineDB } from '@/lib/db/offline';

// Mock the offline database
jest.mock('@/lib/db/offline', () => ({
  offlineDB: {
    getSyncQueue: jest.fn(),
    removeSyncQueueItem: jest.fn(),
    updateSyncQueueItem: jest.fn(),
    addToSyncQueue: jest.fn(),
    syncQueue: {
      count: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    syncEngine = SyncEngine.getInstance();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true
    });
  });

  afterEach(() => {
    // Clean up any running intervals/timeouts
    syncEngine.destroy();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SyncEngine.getInstance();
      const instance2 = SyncEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('connectivity detection', () => {
    it('should detect online status', () => {
      const status = syncEngine.getConnectivityStatus();
      expect(status.isOnline).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false
      });
      
      // Create new instance to get updated status
      const offlineEngine = SyncEngine.getInstance();
      const status = offlineEngine.getConnectivityStatus();
      expect(status.isOnline).toBe(false);
    });

    it('should notify connectivity changes', (done) => {
      const listener = jest.fn((status: ConnectivityStatus) => {
        expect(status.isOnline).toBe(false);
        done();
      });

      syncEngine.onConnectivityChange(listener);

      // Simulate offline event
      Object.defineProperty(navigator, 'onLine', {
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    });

    it('should allow unsubscribing from connectivity changes', () => {
      const listener = jest.fn();
      const unsubscribe = syncEngine.onConnectivityChange(listener);
      
      unsubscribe();
      
      // Simulate connectivity change
      window.dispatchEvent(new Event('offline'));
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('sync operations', () => {
    beforeEach(() => {
      // Mock database responses
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([
        {
          uuid: 'item1',
          type: 'assessment',
          action: 'create',
          entityUuid: 'entity1',
          decryptedData: { id: '1', value: 'test' },
          priority: 5,
          attempts: 0,
          timestamp: new Date()
        }
      ]);
      
      (offlineDB.syncQueue.count as jest.Mock).mockResolvedValue(1);
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false
      });

      const result = await syncEngine.triggerSync();
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty result when no items to sync', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const result = await syncEngine.triggerSync();
      
      expect(result).toEqual({
        successful: [],
        conflicts: [],
        failed: [],
        totalProcessed: 0
      });
    });

    it('should process successful sync', async () => {
      const mockResponse = [
        {
          offlineId: 'item1',
          serverId: 'server1',
          status: 'success',
          message: 'Synced successfully'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await syncEngine.triggerSync();

      expect(result).toEqual({
        successful: mockResponse,
        conflicts: [],
        failed: [],
        totalProcessed: 1
      });

      expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledWith('item1');
    });

    it('should handle sync conflicts', async () => {
      const mockResponse = [
        {
          offlineId: 'item1',
          serverId: 'server1',
          status: 'conflict',
          message: 'Conflict detected',
          conflictData: { id: '1', value: 'server_value', version: 2 }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await syncEngine.triggerSync();

      expect(result).toEqual({
        successful: [],
        conflicts: mockResponse,
        failed: [],
        totalProcessed: 1
      });

      // Should remove item after conflict resolution
      expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledWith('item1');
    });

    it('should handle sync failures with retry', async () => {
      const mockResponse = [
        {
          offlineId: 'item1',
          serverId: '',
          status: 'failed',
          message: 'Server error'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await syncEngine.triggerSync();

      expect(result).toEqual({
        successful: [],
        conflicts: [],
        failed: mockResponse,
        totalProcessed: 1
      });

      // Should update item for retry
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith(
        'item1',
        expect.objectContaining({
          attempts: 1,
          nextRetry: expect.any(Date),
          error: 'Server error'
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await syncEngine.triggerSync();

      expect(result).toEqual({
        successful: [],
        conflicts: [],
        failed: [
          {
            offlineId: 'item1',
            serverId: '',
            status: 'failed',
            message: 'Network error'
          }
        ],
        totalProcessed: 1
      });
    });

    it('should respect max batch size', async () => {
      const largeQueue = Array.from({ length: 150 }, (_, i) => ({
        uuid: `item${i}`,
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: `entity${i}`,
        decryptedData: { id: i.toString() },
        priority: 5,
        attempts: 0,
        timestamp: new Date()
      }));

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(largeQueue);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => Array.from({ length: 100 }, (_, i) => ({
          offlineId: `item${i}`,
          serverId: `server${i}`,
          status: 'success'
        }))
      } as Response);

      const result = await syncEngine.triggerSync();

      expect(result?.totalProcessed).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/sync/batch',
        expect.objectContaining({
          body: expect.stringContaining('"changes"'),
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.changes).toHaveLength(100);
    });
  });

  describe('queue management', () => {
    it('should add items to sync queue', async () => {
      await syncEngine.addToQueue('assessment', 'create', 'entity1', { test: 'data' }, 7);

      expect(offlineDB.addToSyncQueue).toHaveBeenCalledWith({
        uuid: expect.any(String),
        type: 'assessment',
        action: 'create',
        entityUuid: 'entity1',
        data: { test: 'data' },
        priority: 7
      });
    });

    it('should trigger background sync when adding to queue', async () => {
      const triggerSyncSpy = jest.spyOn(syncEngine, 'triggerSync');
      triggerSyncSpy.mockResolvedValue(null);

      await syncEngine.addToQueue('assessment', 'create', 'entity1', { test: 'data' });

      // Wait for background sync to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(triggerSyncSpy).toHaveBeenCalled();
    });

    it('should get queue status', async () => {
      const mockQueueItems = [
        {
          uuid: 'item1',
          attempts: 0,
          timestamp: new Date('2024-01-01'),
          nextRetry: undefined
        },
        {
          uuid: 'item2',
          attempts: 3,
          timestamp: new Date('2024-01-02'),
          nextRetry: undefined
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockQueueItems);
      (offlineDB.syncQueue.count as jest.Mock).mockResolvedValue(2);

      const status = await syncEngine.getQueueStatus();

      expect(status).toEqual({
        totalItems: 2,
        pendingItems: 1, // Only item1 (attempts < 3)
        failedItems: 1,  // Only item2 (attempts >= 3)
        oldestItem: new Date('2024-01-01'),
        isOnline: true,
        syncInProgress: false
      });
    });

    it('should clear failed items', async () => {
      const failedItems = [
        { uuid: 'item1', attempts: 3 },
        { uuid: 'item2', attempts: 5 }
      ];

      (offlineDB.syncQueue.where as jest.Mock) = jest.fn().mockReturnValue({
        aboveOrEqual: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(failedItems)
        })
      });

      const clearedCount = await syncEngine.clearFailedItems();

      expect(clearedCount).toBe(2);
      expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledTimes(2);
    });

    it('should retry failed items', async () => {
      (offlineDB.syncQueue.where as jest.Mock) = jest.fn().mockReturnValue({
        aboveOrEqual: jest.fn().mockReturnValue({
          modify: jest.fn().mockResolvedValue(2)
        })
      });

      const triggerSyncSpy = jest.spyOn(syncEngine, 'triggerSync');
      triggerSyncSpy.mockResolvedValue(null);

      await syncEngine.retryFailedItems();

      expect(triggerSyncSpy).toHaveBeenCalled();
    });
  });

  describe('retry logic', () => {
    it('should implement exponential backoff', async () => {
      const mockQueueItem = {
        uuid: 'item1',
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: 'entity1',
        decryptedData: { id: '1' },
        priority: 5,
        attempts: 1,
        timestamp: new Date()
      };

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([mockQueueItem]);

      const mockResponse = [
        {
          offlineId: 'item1',
          serverId: '',
          status: 'failed',
          message: 'Server temporarily unavailable'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      await syncEngine.triggerSync();

      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith(
        'item1',
        expect.objectContaining({
          attempts: 2,
          nextRetry: expect.any(Date)
        })
      );
    });

    it('should give up after max retries', async () => {
      const mockQueueItem = {
        uuid: 'item1',
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: 'entity1',
        decryptedData: { id: '1' },
        priority: 5,
        attempts: 3, // Already at max retries
        timestamp: new Date()
      };

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([mockQueueItem]);

      const mockResponse = [
        {
          offlineId: 'item1',
          serverId: '',
          status: 'failed',
          message: 'Persistent server error'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      await syncEngine.triggerSync();

      expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledWith('item1');
    });
  });

  describe('error handling', () => {
    it('should handle malformed server responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      } as Response);

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([
        {
          uuid: 'item1',
          type: 'assessment',
          action: 'create',
          entityUuid: 'entity1',
          decryptedData: { id: '1' },
          priority: 5,
          attempts: 0,
          timestamp: new Date()
        }
      ]);

      const result = await syncEngine.triggerSync();

      expect(result?.failed).toHaveLength(1);
      expect(result?.failed[0].message).toContain('Invalid JSON');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await syncEngine.triggerSync();

      expect(result?.failed).toHaveLength(1);
      expect(result?.failed[0].message).toContain('500');
    });
  });
});