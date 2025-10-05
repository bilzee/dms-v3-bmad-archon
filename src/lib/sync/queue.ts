import { offlineDB, SyncQueueItem } from '@/lib/db/offline';

export interface QueueItemStatus {
  uuid: string;
  type: 'assessment' | 'response' | 'entity';
  action: 'create' | 'update' | 'delete';
  entityUuid: string;
  priority: number;
  attempts: number;
  status: 'pending' | 'retrying' | 'failed' | 'max_retries';
  lastAttempt?: Date;
  nextRetry?: Date;
  error?: string;
  timestamp: Date;
}

export interface QueueMetrics {
  total: number;
  pending: number;
  retrying: number;
  failed: number;
  maxRetries: number;
  oldestPending?: Date;
  avgRetryAttempts: number;
  byType: {
    assessment: number;
    response: number;
    entity: number;
  };
  byAction: {
    create: number;
    update: number;
    delete: number;
  };
}

export class SyncQueueManager {
  private static instance: SyncQueueManager;
  private readonly MAX_RETRIES = 3;

  private constructor() {}

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  async addItem(
    type: 'assessment' | 'response' | 'entity',
    action: 'create' | 'update' | 'delete',
    entityUuid: string,
    data: any,
    priority: number = 5
  ): Promise<string> {
    const uuid = crypto.randomUUID();
    
    await offlineDB.addToSyncQueue({
      uuid,
      type,
      action,
      entityUuid,
      data,
      priority,
      attempts: 0,
      timestamp: new Date()
    });

    console.log(`Added ${type} ${action} for ${entityUuid} to sync queue with priority ${priority}`);
    return uuid;
  }

  async updateItem(uuid: string, updates: Partial<SyncQueueItem>): Promise<boolean> {
    try {
      const updated = await offlineDB.updateSyncQueueItem(uuid, updates);
      return updated > 0;
    } catch (error) {
      console.error('Failed to update queue item:', error);
      return false;
    }
  }

  async removeItem(uuid: string): Promise<boolean> {
    try {
      await offlineDB.removeSyncQueueItem(uuid);
      return true;
    } catch (error) {
      console.error('Failed to remove queue item:', error);
      return false;
    }
  }

  async getItem(uuid: string): Promise<QueueItemStatus | null> {
    try {
      const items = await offlineDB.getSyncQueue();
      const item = items.find(i => i.uuid === uuid);
      
      if (!item) return null;
      
      return this.mapToQueueItemStatus(item);
    } catch (error) {
      console.error('Failed to get queue item:', error);
      return null;
    }
  }

  async getItems(options?: {
    limit?: number;
    offset?: number;
    type?: 'assessment' | 'response' | 'entity';
    status?: 'pending' | 'retrying' | 'failed' | 'max_retries';
    sortBy?: 'priority' | 'timestamp' | 'attempts';
    sortOrder?: 'asc' | 'desc';
  }): Promise<QueueItemStatus[]> {
    try {
      let items = await offlineDB.getSyncQueue();
      
      // Apply filters
      if (options?.type) {
        items = items.filter(item => item.type === options.type);
      }
      
      if (options?.status) {
        items = items.filter(item => {
          const status = this.getItemStatus(item);
          return status === options.status;
        });
      }
      
      // Apply sorting
      const sortBy = options?.sortBy || 'priority';
      const sortOrder = options?.sortOrder || 'desc';
      
      items.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'priority':
            comparison = a.priority - b.priority;
            break;
          case 'timestamp':
            comparison = a.timestamp.getTime() - b.timestamp.getTime();
            break;
          case 'attempts':
            comparison = a.attempts - b.attempts;
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      if (options?.offset || options?.limit) {
        const start = options?.offset || 0;
        const end = options?.limit ? start + options.limit : undefined;
        items = items.slice(start, end);
      }
      
      return items.map(item => this.mapToQueueItemStatus(item));
    } catch (error) {
      console.error('Failed to get queue items:', error);
      return [];
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      const items = await offlineDB.getSyncQueue();
      
      const metrics: QueueMetrics = {
        total: items.length,
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
      };
      
      if (items.length === 0) return metrics;
      
      let totalAttempts = 0;
      let oldestPending: Date | undefined;
      
      for (const item of items) {
        const status = this.getItemStatus(item);
        
        // Count by status
        switch (status) {
          case 'pending':
            metrics.pending++;
            if (!oldestPending || item.timestamp < oldestPending) {
              oldestPending = item.timestamp;
            }
            break;
          case 'retrying':
            metrics.retrying++;
            break;
          case 'failed':
            metrics.failed++;
            break;
          case 'max_retries':
            metrics.maxRetries++;
            break;
        }
        
        // Count by type
        metrics.byType[item.type]++;
        
        // Count by action
        metrics.byAction[item.action]++;
        
        // Sum attempts for average calculation
        totalAttempts += item.attempts;
      }
      
      metrics.avgRetryAttempts = totalAttempts / items.length;
      metrics.oldestPending = oldestPending;
      
      return metrics;
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return {
        total: 0,
        pending: 0,
        retrying: 0,
        failed: 0,
        maxRetries: 0,
        avgRetryAttempts: 0,
        byType: { assessment: 0, response: 0, entity: 0 },
        byAction: { create: 0, update: 0, delete: 0 }
      };
    }
  }

  async getPendingItems(limit?: number): Promise<QueueItemStatus[]> {
    return this.getItems({
      status: 'pending',
      limit,
      sortBy: 'priority',
      sortOrder: 'desc'
    });
  }

  async getReadyForRetry(): Promise<QueueItemStatus[]> {
    try {
      const items = await offlineDB.getSyncQueue();
      const now = new Date();
      
      const readyItems = items.filter(item => {
        const status = this.getItemStatus(item);
        return status === 'retrying' && (!item.nextRetry || item.nextRetry <= now);
      });
      
      return readyItems.map(item => this.mapToQueueItemStatus(item));
    } catch (error) {
      console.error('Failed to get items ready for retry:', error);
      return [];
    }
  }

  async markAsRetrying(uuid: string, nextRetryTime: Date, error?: string): Promise<boolean> {
    try {
      const item = await this.getItem(uuid);
      if (!item) return false;
      
      const updated = await this.updateItem(uuid, {
        attempts: item.attempts + 1,
        lastAttempt: new Date(),
        nextRetry: nextRetryTime,
        error
      });
      
      return updated;
    } catch (error) {
      console.error('Failed to mark item as retrying:', error);
      return false;
    }
  }

  async markAsFailed(uuid: string, error: string): Promise<boolean> {
    try {
      const updated = await this.updateItem(uuid, {
        error,
        lastAttempt: new Date()
      });
      
      return updated;
    } catch (error) {
      console.error('Failed to mark item as failed:', error);
      return false;
    }
  }

  async resetFailedItems(): Promise<number> {
    try {
      const failedItems = await this.getItems({ status: 'max_retries' });
      
      let resetCount = 0;
      for (const item of failedItems) {
        const success = await this.updateItem(item.uuid, {
          attempts: 0,
          lastAttempt: undefined,
          nextRetry: undefined,
          error: undefined
        });
        
        if (success) resetCount++;
      }
      
      console.log(`Reset ${resetCount} failed items for retry`);
      return resetCount;
    } catch (error) {
      console.error('Failed to reset failed items:', error);
      return 0;
    }
  }

  async clearFailedItems(): Promise<number> {
    try {
      const failedItems = await this.getItems({ status: 'max_retries' });
      
      let clearedCount = 0;
      for (const item of failedItems) {
        const success = await this.removeItem(item.uuid);
        if (success) clearedCount++;
      }
      
      console.log(`Cleared ${clearedCount} failed items from queue`);
      return clearedCount;
    } catch (error) {
      console.error('Failed to clear failed items:', error);
      return 0;
    }
  }

  async clearCompletedItems(): Promise<number> {
    try {
      // In this implementation, completed items are automatically removed,
      // but this method can be used for cleanup of any orphaned items
      const allItems = await offlineDB.getSyncQueue();
      
      // Remove items that have been marked as synced in their parent entities
      let clearedCount = 0;
      
      for (const item of allItems) {
        let shouldRemove = false;
        
        try {
          switch (item.type) {
            case 'assessment':
              const assessment = await offlineDB.getAssessment(item.entityUuid);
              if (assessment?.syncStatus === 'synced') {
                shouldRemove = true;
              }
              break;
              
            case 'response':
              const response = await offlineDB.getResponse(item.entityUuid);
              if (response?.syncStatus === 'synced') {
                shouldRemove = true;
              }
              break;
              
            case 'entity':
              const entity = await offlineDB.getEntity(item.entityUuid);
              if (entity?.syncStatus === 'synced') {
                shouldRemove = true;
              }
              break;
          }
          
          if (shouldRemove) {
            await this.removeItem(item.uuid);
            clearedCount++;
          }
        } catch (error) {
          console.warn(`Error checking sync status for ${item.type} ${item.entityUuid}:`, error);
        }
      }
      
      if (clearedCount > 0) {
        console.log(`Cleared ${clearedCount} completed items from queue`);
      }
      
      return clearedCount;
    } catch (error) {
      console.error('Failed to clear completed items:', error);
      return 0;
    }
  }

  async prioritizeItem(uuid: string, newPriority: number): Promise<boolean> {
    return this.updateItem(uuid, { priority: newPriority });
  }

  async reprioritizeType(
    type: 'assessment' | 'response' | 'entity',
    newPriority: number
  ): Promise<number> {
    try {
      const items = await this.getItems({ type });
      
      let updatedCount = 0;
      for (const item of items) {
        const success = await this.prioritizeItem(item.uuid, newPriority);
        if (success) updatedCount++;
      }
      
      console.log(`Updated priority for ${updatedCount} ${type} items to ${newPriority}`);
      return updatedCount;
    } catch (error) {
      console.error(`Failed to reprioritize ${type} items:`, error);
      return 0;
    }
  }

  private getItemStatus(item: SyncQueueItem): 'pending' | 'retrying' | 'failed' | 'max_retries' {
    if (item.attempts >= this.MAX_RETRIES) {
      return 'max_retries';
    }
    
    if (item.attempts > 0 && item.error) {
      const now = new Date();
      if (item.nextRetry && item.nextRetry > now) {
        return 'retrying';
      } else {
        return 'failed';
      }
    }
    
    return 'pending';
  }

  private mapToQueueItemStatus(item: SyncQueueItem): QueueItemStatus {
    return {
      uuid: item.uuid,
      type: item.type,
      action: item.action,
      entityUuid: item.entityUuid,
      priority: item.priority,
      attempts: item.attempts,
      status: this.getItemStatus(item),
      lastAttempt: item.lastAttempt,
      nextRetry: item.nextRetry,
      error: item.error,
      timestamp: item.timestamp
    };
  }
}

// Export singleton instance
export const queueManager = SyncQueueManager.getInstance();