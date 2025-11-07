import { SyncQueueManager, QueueItemStatus, QueueMetrics } from '@/lib/sync/queue';
import { offlineDB } from '@/lib/db/offline';

// Mock the offline database
jest.mock('@/lib/db/offline', () => ({
  offlineDB: {
    getSyncQueue: jest.fn(),
    addToSyncQueue: jest.fn(),
    updateSyncQueueItem: jest.fn(),
    removeSyncQueueItem: jest.fn()
  }
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234')
  }
});

describe('SyncQueueManager', () => {
  let queueManager: SyncQueueManager;

  beforeEach(() => {
    jest.clearAllMocks();
    queueManager = SyncQueueManager.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SyncQueueManager.getInstance();
      const instance2 = SyncQueueManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addItem', () => {
    it('should add item to sync queue', async () => {
      const uuid = await queueManager.addItem(
        'assessment',
        'create',
        'entity1',
        { test: 'data' },
        8
      );

      expect(uuid).toBe('mock-uuid-1234');
      expect(offlineDB.addToSyncQueue).toHaveBeenCalledWith({
        uuid: 'mock-uuid-1234',
        type: 'assessment',
        action: 'create',
        entityUuid: 'entity1',
        data: { test: 'data' },
        priority: 8
      });
    });

    it('should use default priority when not specified', async () => {
      await queueManager.addItem(
        'response',
        'update',
        'entity2',
        { test: 'data' }
      );

      expect(offlineDB.addToSyncQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 5
        })
      );
    });
  });

  describe('updateItem', () => {
    it('should update queue item successfully', async () => {
      (offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(1);

      const result = await queueManager.updateItem('uuid1', { attempts: 2 });

      expect(result).toBe(true);
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('uuid1', { attempts: 2 });
    });

    it('should return false when update fails', async () => {
      (offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(0);

      const result = await queueManager.updateItem('uuid1', { attempts: 2 });

      expect(result).toBe(false);
    });

    it('should handle update errors', async () => {
      (offlineDB.updateSyncQueueItem as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const result = await queueManager.updateItem('uuid1', { attempts: 2 });

      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('should remove queue item successfully', async () => {
      (offlineDB.removeSyncQueueItem as jest.Mock).mockResolvedValue(undefined);

      const result = await queueManager.removeItem('uuid1');

      expect(result).toBe(true);
      expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledWith('uuid1');
    });

    it('should handle removal errors', async () => {
      (offlineDB.removeSyncQueueItem as jest.Mock).mockRejectedValue(new Error('Remove failed'));

      const result = await queueManager.removeItem('uuid1');

      expect(result).toBe(false);
    });
  });

  describe('getItem', () => {
    it('should return queue item when found', async () => {
      const mockItem = {
        uuid: 'uuid1',
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: 'entity1',
        priority: 5,
        attempts: 1,
        timestamp: new Date('2024-01-01'),
        lastAttempt: new Date('2024-01-01T01:00:00Z'),
        nextRetry: new Date('2024-01-01T01:05:00Z'),
        error: 'Network error'
      };

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([mockItem]);

      const result = await queueManager.getItem('uuid1');

      expect(result).toEqual({
        uuid: 'uuid1',
        type: 'assessment',
        action: 'create',
        entityUuid: 'entity1',
        priority: 5,
        attempts: 1,
        status: 'retrying',
        timestamp: mockItem.timestamp,
        lastAttempt: mockItem.lastAttempt,
        nextRetry: mockItem.nextRetry,
        error: 'Network error'
      });
    });

    it('should return null when item not found', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const result = await queueManager.getItem('nonexistent');

      expect(result).toBe(null);
    });

    it('should handle errors gracefully', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await queueManager.getItem('uuid1');

      expect(result).toBe(null);
    });
  });

  describe('getItems', () => {
    const mockItems = [
      {
        uuid: 'uuid1',
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: 'entity1',
        priority: 8,
        attempts: 0,
        timestamp: new Date('2024-01-01')
      },
      {
        uuid: 'uuid2',
        type: 'response' as const,
        action: 'update' as const,
        entityUuid: 'entity2',
        priority: 5,
        attempts: 2,
        timestamp: new Date('2024-01-02'),
        error: 'Server error'
      },
      {
        uuid: 'uuid3',
        type: 'entity' as const,
        action: 'delete' as const,
        entityUuid: 'entity3',
        priority: 3,
        attempts: 4,
        timestamp: new Date('2024-01-03')
      }
    ];

    beforeEach(() => {
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockItems);
    });

    it('should return all items when no filters applied', async () => {
      const result = await queueManager.getItems();

      expect(result).toHaveLength(3);
      expect(result[0].priority).toBe(8); // Sorted by priority desc
    });

    it('should filter by type', async () => {
      const result = await queueManager.getItems({ type: 'assessment' });

      expect(result).toHaveLength(1);
      expect(result[0].uuid).toBe('uuid1');
    });

    it('should filter by status', async () => {
      const result = await queueManager.getItems({ status: 'max_retries' });

      expect(result).toHaveLength(1);
      expect(result[0].uuid).toBe('uuid3');
    });

    it('should apply limit and offset', async () => {
      const result = await queueManager.getItems({ limit: 1, offset: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].uuid).toBe('uuid2'); // Second item after sorting
    });

    it('should sort by timestamp ascending', async () => {
      const result = await queueManager.getItems({ 
        sortBy: 'timestamp', 
        sortOrder: 'asc' 
      });

      expect(result[0].uuid).toBe('uuid1');
      expect(result[1].uuid).toBe('uuid2');
      expect(result[2].uuid).toBe('uuid3');
    });

    it('should sort by attempts descending', async () => {
      const result = await queueManager.getItems({ 
        sortBy: 'attempts', 
        sortOrder: 'desc' 
      });

      expect(result[0].uuid).toBe('uuid3'); // 4 attempts
      expect(result[1].uuid).toBe('uuid2'); // 2 attempts
      expect(result[2].uuid).toBe('uuid1'); // 0 attempts
    });

    it('should handle errors gracefully', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await queueManager.getItems();

      expect(result).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should calculate queue metrics correctly', async () => {
      const mockItems = [
        {
          uuid: 'uuid1',
          type: 'assessment' as const,
          action: 'create' as const,
          entityUuid: 'entity1',
          priority: 5,
          attempts: 0,
          timestamp: new Date('2024-01-01')
        },
        {
          uuid: 'uuid2',
          type: 'assessment' as const,
          action: 'update' as const,
          entityUuid: 'entity2',
          priority: 5,
          attempts: 1,
          timestamp: new Date('2024-01-02'),
          nextRetry: new Date('2024-01-02T02:00:00Z'),
          error: 'Retry needed'
        },
        {
          uuid: 'uuid3',
          type: 'response' as const,
          action: 'delete' as const,
          entityUuid: 'entity3',
          priority: 5,
          attempts: 3,
          timestamp: new Date('2024-01-03'),
          error: 'Max retries exceeded'
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockItems);

      const metrics = await queueManager.getMetrics();

      expect(metrics).toEqual({
        total: 3,
        pending: 1,  // uuid1
        retrying: 1, // uuid2
        failed: 0,
        maxRetries: 1, // uuid3
        avgRetryAttempts: (0 + 1 + 3) / 3,
        oldestPending: new Date('2024-01-01'),
        byType: {
          assessment: 2,
          response: 1,
          entity: 0
        },
        byAction: {
          create: 1,
          update: 1,
          delete: 1
        }
      });
    });

    it('should return empty metrics when no items', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const metrics = await queueManager.getMetrics();

      expect(metrics).toEqual({
        total: 0,
        pending: 0,
        retrying: 0,
        failed: 0,
        maxRetries: 0,
        avgRetryAttempts: 0,
        byType: {
          assessment: 0,
          response: 0,
          entity: 0
        },
        byAction: {
          create: 0,
          update: 0,
          delete: 0
        }
      });
    });

    it('should handle errors gracefully', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockRejectedValue(new Error('Database error'));

      const metrics = await queueManager.getMetrics();

      expect(metrics.total).toBe(0);
    });
  });

  describe('getPendingItems', () => {
    it('should return only pending items', async () => {
      const mockItems = [
        {
          uuid: 'uuid1',
          type: 'assessment' as const,
          action: 'create' as const,
          entityUuid: 'entity1',
          priority: 8,
          attempts: 0,
          timestamp: new Date()
        },
        {
          uuid: 'uuid2',
          type: 'response' as const,
          action: 'update' as const,
          entityUuid: 'entity2',
          priority: 5,
          attempts: 3,
          timestamp: new Date(),
          error: 'Max retries'
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockItems);

      const result = await queueManager.getPendingItems();

      expect(result).toHaveLength(1);
      expect(result[0].uuid).toBe('uuid1');
      expect(result[0].status).toBe('pending');
    });

    it('should respect limit parameter', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => ({
        uuid: `uuid${i}`,
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: `entity${i}`,
        priority: 5,
        attempts: 0,
        timestamp: new Date()
      }));

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockItems);

      const result = await queueManager.getPendingItems(3);

      expect(result).toHaveLength(3);
    });
  });

  describe('markAsRetrying', () => {
    it('should mark item as retrying with incremented attempts', async () => {
      const mockItem = {
        uuid: 'uuid1',
        type: 'assessment' as const,
        action: 'create' as const,
        entityUuid: 'entity1',
        priority: 5,
        attempts: 1,
        status: 'pending' as const,
        timestamp: new Date()
      };

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([mockItem]);
      (offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(1);

      const nextRetry = new Date(Date.now() + 5000);
      const result = await queueManager.markAsRetrying('uuid1', nextRetry, 'Network error');

      expect(result).toBe(true);
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('uuid1', {
        attempts: 2,
        lastAttempt: expect.any(Date),
        nextRetry,
        error: 'Network error'
      });
    });

    it('should return false when item not found', async () => {
      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const result = await queueManager.markAsRetrying('nonexistent', new Date());

      expect(result).toBe(false);
    });
  });

  describe('resetFailedItems', () => {
    it('should reset all failed items', async () => {
      const failedItems = [
        {
          uuid: 'uuid1',
          type: 'assessment' as const,
          action: 'create' as const,
          entityUuid: 'entity1',
          priority: 5,
          attempts: 3,
          status: 'max_retries' as const,
          timestamp: new Date()
        },
        {
          uuid: 'uuid2',
          type: 'response' as const,
          action: 'update' as const,
          entityUuid: 'entity2',
          priority: 5,
          attempts: 5,
          status: 'max_retries' as const,
          timestamp: new Date()
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(failedItems);
      (offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(1);

      const resetCount = await queueManager.resetFailedItems();

      expect(resetCount).toBe(2);
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledTimes(2);
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('uuid1', {
        attempts: 0,
        lastAttempt: undefined,
        nextRetry: undefined,
        error: undefined
      });
    });

    it('should handle reset errors gracefully', async () => {
      const failedItems = [
        {
          uuid: 'uuid1',
          type: 'assessment' as const,
          action: 'create' as const,
          entityUuid: 'entity1',
          priority: 5,
          attempts: 3,
          status: 'max_retries' as const,
          timestamp: new Date()
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(failedItems);
      (offlineDB.updateSyncQueueItem as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const resetCount = await queueManager.resetFailedItems();

      expect(resetCount).toBe(0);
    });
  });

  describe('reprioritizeType', () => {
    it('should update priority for all items of specified type', async () => {
      const mockItems = [
        {
          uuid: 'uuid1',
          type: 'assessment' as const,
          action: 'create' as const,
          entityUuid: 'entity1',
          priority: 5,
          attempts: 0,
          status: 'pending' as const,
          timestamp: new Date()
        },
        {
          uuid: 'uuid2',
          type: 'assessment' as const,
          action: 'update' as const,
          entityUuid: 'entity2',
          priority: 3,
          attempts: 1,
          status: 'retrying' as const,
          timestamp: new Date()
        },
        {
          uuid: 'uuid3',
          type: 'response' as const,
          action: 'create' as const,
          entityUuid: 'entity3',
          priority: 5,
          attempts: 0,
          status: 'pending' as const,
          timestamp: new Date()
        }
      ];

      (offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockItems);
      (offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(1);

      const updatedCount = await queueManager.reprioritizeType('assessment', 9);

      expect(updatedCount).toBe(2);
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('uuid1', { priority: 9 });
      expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('uuid2', { priority: 9 });
      expect(offlineDB.updateSyncQueueItem).not.toHaveBeenCalledWith('uuid3', expect.anything());
    });
  });
});