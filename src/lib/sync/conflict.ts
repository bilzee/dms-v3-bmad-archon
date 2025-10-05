import { offlineDB } from '@/lib/db/offline';

export interface ConflictRecord {
  id?: number;
  conflictId: string;
  entityType: 'assessment' | 'response' | 'entity';
  entityUuid: string;
  localVersion: number;
  serverVersion: number;
  localData: any;
  serverData: any;
  resolutionStrategy: 'last_write_wins' | 'manual' | 'merge';
  resolvedData?: any;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: {
    localLastModified: Date;
    serverLastModified: Date;
    conflictReason: string;
    autoResolved: boolean;
  };
}

export interface ConflictResolutionResult {
  success: boolean;
  resolvedData?: any;
  strategy: 'last_write_wins' | 'manual' | 'merge';
  message: string;
}

export interface ConflictStats {
  total: number;
  unresolved: number;
  autoResolved: number;
  manuallyResolved: number;
  byType: {
    assessment: number;
    response: number;
    entity: number;
  };
  recentConflicts: ConflictRecord[];
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  private constructor() {
    this.initializeConflictTable();
  }

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  private async initializeConflictTable(): Promise<void> {
    try {
      // Check if we need to add conflict table to existing database
      if (!offlineDB.tables.some(table => table.name === 'syncConflicts')) {
        // This would be handled by database migration in a real application
        console.log('Conflict tracking table not found - would need database migration');
      }
    } catch (error) {
      console.error('Failed to initialize conflict table:', error);
    }
  }

  async detectConflict(
    entityType: 'assessment' | 'response' | 'entity',
    entityUuid: string,
    localData: any,
    serverData: any,
    localVersion: number,
    serverVersion: number
  ): Promise<ConflictRecord | null> {
    try {
      // Simple version-based conflict detection
      if (localVersion !== serverVersion) {
        const conflictId = crypto.randomUUID();
        
        const conflict: ConflictRecord = {
          conflictId,
          entityType,
          entityUuid,
          localVersion,
          serverVersion,
          localData,
          serverData,
          resolutionStrategy: 'last_write_wins', // Default strategy
          isResolved: false,
          createdAt: new Date(),
          metadata: {
            localLastModified: localData.lastModified || new Date(),
            serverLastModified: serverData.lastModified || new Date(),
            conflictReason: `Version mismatch: local v${localVersion}, server v${serverVersion}`,
            autoResolved: false
          }
        };

        console.log(`Conflict detected for ${entityType} ${entityUuid}: local v${localVersion} vs server v${serverVersion}`);
        
        return conflict;
      }

      return null;
    } catch (error) {
      console.error('Error detecting conflict:', error);
      return null;
    }
  }

  async resolveConflict(
    conflict: ConflictRecord,
    strategy?: 'last_write_wins' | 'manual' | 'merge',
    manualData?: any
  ): Promise<ConflictResolutionResult> {
    try {
      const resolutionStrategy = strategy || conflict.resolutionStrategy;
      
      let resolvedData: any;
      let message: string;
      let success = true;

      switch (resolutionStrategy) {
        case 'last_write_wins':
          resolvedData = await this.resolveLastWriteWins(conflict);
          message = 'Conflict resolved using last-write-wins strategy';
          break;

        case 'manual':
          if (!manualData) {
            return {
              success: false,
              strategy: resolutionStrategy,
              message: 'Manual resolution requires resolved data'
            };
          }
          resolvedData = manualData;
          message = 'Conflict resolved manually';
          break;

        case 'merge':
          resolvedData = await this.resolveMerge(conflict);
          message = 'Conflict resolved using merge strategy';
          break;

        default:
          return {
            success: false,
            strategy: resolutionStrategy,
            message: `Unsupported resolution strategy: ${resolutionStrategy}`
          };
      }

      // Apply the resolution
      await this.applyResolution(conflict, resolvedData, resolutionStrategy);

      // Log the conflict resolution
      await this.logConflictResolution(conflict, resolvedData, resolutionStrategy);

      return {
        success,
        resolvedData,
        strategy: resolutionStrategy,
        message
      };

    } catch (error) {
      console.error('Error resolving conflict:', error);
      return {
        success: false,
        strategy: strategy || conflict.resolutionStrategy,
        message: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async resolveLastWriteWins(conflict: ConflictRecord): Promise<any> {
    const localModified = conflict.metadata?.localLastModified || new Date(0);
    const serverModified = conflict.metadata?.serverLastModified || new Date(0);

    // Use the data with the most recent modification time
    if (serverModified > localModified) {
      console.log(`Last-write-wins: Using server data (${serverModified} > ${localModified})`);
      return conflict.serverData;
    } else {
      console.log(`Last-write-wins: Using local data (${localModified} >= ${serverModified})`);
      return conflict.localData;
    }
  }

  private async resolveMerge(conflict: ConflictRecord): Promise<any> {
    // Simple merge strategy - in a real application, this would be more sophisticated
    try {
      const merged = {
        ...conflict.serverData,
        ...conflict.localData,
        // Use the latest lastModified timestamp
        lastModified: new Date(Math.max(
          new Date(conflict.localData.lastModified || 0).getTime(),
          new Date(conflict.serverData.lastModified || 0).getTime()
        )),
        // Increment version for merged data
        version: Math.max(conflict.localVersion, conflict.serverVersion) + 1,
        // Add merge metadata
        _mergedAt: new Date(),
        _mergeSource: 'auto_merge'
      };

      console.log(`Merged conflict for ${conflict.entityType} ${conflict.entityUuid}`);
      return merged;
    } catch (error) {
      console.error('Error during merge resolution:', error);
      // Fall back to last-write-wins
      return this.resolveLastWriteWins(conflict);
    }
  }

  private async applyResolution(
    conflict: ConflictRecord,
    resolvedData: any,
    strategy: string
  ): Promise<void> {
    try {
      switch (conflict.entityType) {
        case 'assessment':
          await offlineDB.updateAssessment(conflict.entityUuid, {
            data: resolvedData,
            lastModified: new Date(),
            syncStatus: 'synced'
          });
          break;

        case 'response':
          await offlineDB.responses
            .where('uuid').equals(conflict.entityUuid)
            .modify({
              data: await (await offlineDB.encryptData(resolvedData)).encryptedData,
              lastModified: new Date(),
              syncStatus: 'synced'
            });
          break;

        case 'entity':
          await offlineDB.entities
            .where('uuid').equals(conflict.entityUuid)
            .modify({
              data: await (await offlineDB.encryptData(resolvedData)).encryptedData,
              lastModified: new Date(),
              syncStatus: 'synced'
            });
          break;
      }

      console.log(`Applied ${strategy} resolution for ${conflict.entityType} ${conflict.entityUuid}`);
    } catch (error) {
      console.error('Error applying conflict resolution:', error);
      throw error;
    }
  }

  private async logConflictResolution(
    conflict: ConflictRecord,
    resolvedData: any,
    strategy: string
  ): Promise<void> {
    try {
      // In a real application, this would store to a conflicts table
      // For now, we'll log to console and local storage as a fallback
      
      const resolutionLog: ConflictRecord = {
        ...conflict,
        resolvedData,
        resolutionStrategy: strategy as 'last_write_wins' | 'manual' | 'merge',
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'system', // or user ID for manual resolutions
        metadata: {
          ...conflict.metadata,
          autoResolved: strategy !== 'manual'
        }
      };

      // Store in local storage as fallback
      const existingLogs = this.getStoredConflictLogs();
      existingLogs.push(resolutionLog);
      
      // Keep only last 100 conflict logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('dms_conflict_logs', JSON.stringify(existingLogs));

      console.log(`Logged conflict resolution for ${conflict.entityType} ${conflict.entityUuid}`);
    } catch (error) {
      console.error('Error logging conflict resolution:', error);
    }
  }

  private getStoredConflictLogs(): ConflictRecord[] {
    try {
      const logs = localStorage.getItem('dms_conflict_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error reading stored conflict logs:', error);
      return [];
    }
  }

  async getConflictHistory(entityUuid?: string, limit?: number): Promise<ConflictRecord[]> {
    try {
      let logs = this.getStoredConflictLogs();

      if (entityUuid) {
        logs = logs.filter(log => log.entityUuid === entityUuid);
      }

      // Sort by creation date (newest first)
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (limit) {
        logs = logs.slice(0, limit);
      }

      return logs;
    } catch (error) {
      console.error('Error getting conflict history:', error);
      return [];
    }
  }

  async getConflictStats(): Promise<ConflictStats> {
    try {
      const logs = this.getStoredConflictLogs();
      
      const stats: ConflictStats = {
        total: logs.length,
        unresolved: 0,
        autoResolved: 0,
        manuallyResolved: 0,
        byType: {
          assessment: 0,
          response: 0,
          entity: 0
        },
        recentConflicts: []
      };

      for (const log of logs) {
        if (log.isResolved) {
          if (log.metadata?.autoResolved) {
            stats.autoResolved++;
          } else {
            stats.manuallyResolved++;
          }
        } else {
          stats.unresolved++;
        }

        stats.byType[log.entityType]++;
      }

      // Get recent conflicts (last 10)
      stats.recentConflicts = logs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Error getting conflict stats:', error);
      return {
        total: 0,
        unresolved: 0,
        autoResolved: 0,
        manuallyResolved: 0,
        byType: { assessment: 0, response: 0, entity: 0 },
        recentConflicts: []
      };
    }
  }

  async clearOldConflicts(olderThanDays: number = 30): Promise<number> {
    try {
      const logs = this.getStoredConflictLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const remainingLogs = logs.filter(log => 
        new Date(log.createdAt) > cutoffDate
      );

      const clearedCount = logs.length - remainingLogs.length;
      
      localStorage.setItem('dms_conflict_logs', JSON.stringify(remainingLogs));

      console.log(`Cleared ${clearedCount} conflict logs older than ${olderThanDays} days`);
      return clearedCount;
    } catch (error) {
      console.error('Error clearing old conflicts:', error);
      return 0;
    }
  }

  // Utility method to handle conflicts during sync
  async handleSyncConflict(
    entityType: 'assessment' | 'response' | 'entity',
    entityUuid: string,
    localData: any,
    serverData: any,
    localVersion: number,
    serverVersion: number
  ): Promise<ConflictResolutionResult> {
    try {
      // Detect conflict
      const conflict = await this.detectConflict(
        entityType,
        entityUuid,
        localData,
        serverData,
        localVersion,
        serverVersion
      );

      if (!conflict) {
        return {
          success: true,
          resolvedData: serverData,
          strategy: 'last_write_wins',
          message: 'No conflict detected'
        };
      }

      // Auto-resolve using last-write-wins
      const result = await this.resolveConflict(conflict, 'last_write_wins');
      
      return result;
    } catch (error) {
      console.error('Error handling sync conflict:', error);
      return {
        success: false,
        strategy: 'last_write_wins',
        message: `Failed to handle conflict: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const conflictResolver = ConflictResolver.getInstance();