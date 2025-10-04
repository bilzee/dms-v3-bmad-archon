# 10. Synchronization Engine

### 10.1 Sync Engine Core

```typescript
// lib/sync/engine.ts

import { prisma } from '@/lib/db/client';
import { SyncStatus, VerificationStatus } from '@prisma/client';
import { AutoApprovalService } from '@/lib/services/auto-approval.service';

export interface SyncChange {
  type: 'assessment' | 'response' | 'media';
  action: 'create' | 'update' | 'delete';
  data: any;
  offlineId?: string;
  versionNumber: number;
}

export interface SyncResult {
  offlineId?: string;
  serverId: string;
  status: 'success' | 'conflict' | 'failed';
  message?: string;
}

export class SyncEngine {
  /**
   * Process batch sync from client
   */
  static async processSyncBatch(
    changes: SyncChange[],
    userId: string
  ): Promise<{
    successful: SyncResult[];
    conflicts: SyncResult[];
    failed: SyncResult[];
  }> {
    const results = {
      successful: [] as SyncResult[],
      conflicts: [] as SyncResult[],
      failed: [] as SyncResult[],
    };
    
    for (const change of changes) {
      try {
        const result = await this.processSingleChange(change, userId);
        
        if (result.status === 'success') {
          results.successful.push(result);
        } else if (result.status === 'conflict') {
          results.conflicts.push(result);
        } else {
          results.failed.push(result);
        }
      } catch (error) {
        results.failed.push({
          offlineId: change.offlineId,
          serverId: '',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }
  
  /**
   * Process single sync change
   */
  private static async processSingleChange(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    switch (change.type) {
      case 'assessment':
        return this.syncAssessment(change, userId);
      case 'response':
        return this.syncResponse(change, userId);
      case 'media':
        return this.syncMedia(change, userId);
      default:
        throw new Error(`Unknown sync type: ${change.type}`);
    }
  }
  
  /**
   * Sync assessment
   */
  private static async syncAssessment(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    const { action, data, offlineId, versionNumber } = change;
    
    if (action === 'create') {
      // Check for existing by offlineId
      if (offlineId) {
        const existing = await prisma.rapidAssessment.findUnique({
          where: { offlineId },
        });
        
        if (existing) {
          return {
            offlineId,
            serverId: existing.id,
            status: 'success',
            message: 'Assessment already synced',
          };
        }
      }
      
      // Check auto-approval
      const shouldAutoApprove = await AutoApprovalService.shouldAutoApprove(
        data.entityId,
        versionNumber === 1
      );
      
      // Create new assessment
      const created = await prisma.rapidAssessment.create({
        data: {
          ...data,
          assessorId: userId, // Override with authenticated user
          offlineId,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          verificationStatus: shouldAutoApprove 
            ? VerificationStatus.AUTO_VERIFIED 
            : VerificationStatus.PENDING,
        },
      });
      
      return {
        offlineId,
        serverId: created.id,
        status: 'success',
      };
    }
    
    if (action === 'update') {
      // Find existing assessment
      const existing = await prisma.rapidAssessment.findUnique({
        where: offlineId ? { offlineId } : { id: data.id },
      });
      
      if (!existing) {
        throw new Error('Assessment not found for update');
      }
      
      // Check for conflict (last-write-wins)
      if (existing.versionNumber >= versionNumber) {
        // Server version is newer - conflict
        await this.logConflict({
          entityType: 'ASSESSMENT',
          entityId: existing.id,
          winningVersion: existing,
          losingVersion: data,
        });
        
        return {
          offlineId,
          serverId: existing.id,
          status: 'conflict',
          message: 'Server version is newer',
        };
      }
      
      // Apply update
      const updated = await prisma.rapidAssessment.update({
        where: { id: existing.id },
        data: {
          ...data,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          updatedAt: new Date(),
        },
      });
      
      return {
        offlineId,
        serverId: updated.id,
        status: 'success',
      };
    }
    
    throw new Error(`Unsupported action: ${action}`);
  }
  
  /**
   * Sync response
   */
  private static async syncResponse(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    const { action, data, offlineId, versionNumber } = change;
    
    if (action === 'create') {
      // Check for existing by offlineId
      if (offlineId) {
        const existing = await prisma.rapidResponse.findUnique({
          where: { offlineId },
        });
        
        if (existing) {
          return {
            offlineId,
            serverId: existing.id,
            status: 'success',
            message: 'Response already synced',
          };
        }
      }
      
      // Validate assessment exists and entityId matches
      const assessment = await prisma.rapidAssessment.findUnique({
        where: { id: data.assessmentId },
        select: { entityId: true },
      });
      
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      
      if (assessment.entityId !== data.entityId) {
        throw new Error('Response entity must match assessment entity');
      }
      
      // Check auto-approval (only if delivered)
      const shouldAutoApprove = data.status === 'DELIVERED' 
        ? await AutoApprovalService.shouldAutoApprove(data.entityId, versionNumber === 1)
        : false;
      
      // Create new response
      const created = await prisma.rapidResponse.create({
        data: {
          ...data,
          responderId: userId, // Override with authenticated user
          offlineId,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          verificationStatus: data.status === 'DELIVERED'
            ? (shouldAutoApprove ? VerificationStatus.AUTO_VERIFIED : VerificationStatus.PENDING)
            : VerificationStatus.DRAFT,
        },
      });
      
      return {
        offlineId,
        serverId: created.id,
        status: 'success',
      };
    }
    
    if (action === 'update') {
      // Find existing response
      const existing = await prisma.rapidResponse.findUnique({
        where: offlineId ? { offlineId } : { id: data.id },
      });
      
      if (!existing) {
        throw new Error('Response not found for update');
      }
      
      // Check for conflict (last-write-wins)
      if (existing.versionNumber >= versionNumber) {
        // Server version is newer - conflict
        await this.logConflict({
          entityType: 'RESPONSE',
          entityId: existing.id,
          winningVersion: existing,
          losingVersion: data,
        });
        
        return {
          offlineId,
          serverId: existing.id,
          status: 'conflict',
          message: 'Server version is newer',
        };
      }
      
      // Check if status changed to DELIVERED
      const statusChanged = existing.status !== data.status && data.status === 'DELIVERED';
      const shouldAutoApprove = statusChanged 
        ? await AutoApprovalService.shouldAutoApprove(data.entityId, versionNumber === 1)
        : false;
      
      // Apply update
      const updated = await prisma.rapidResponse.update({
        where: { id: existing.id },
        data: {
          ...data,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          ...(statusChanged && {
            verificationStatus: shouldAutoApprove 
              ? VerificationStatus.AUTO_VERIFIED 
              : VerificationStatus.PENDING,
          }),
          updatedAt: new Date(),
        },
      });
      
      return {
        offlineId,
        serverId: updated.id,
        status: 'success',
      };
    }
    
    throw new Error(`Unsupported action: ${action}`);
  }
  
  /**
   * Sync media attachment
   */
  private static async syncMedia(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    // Media sync implementation
    // This would typically involve uploading to R2/S3
    // For now, placeholder implementation
    
    const { data, offlineId } = change;
    
    // Upload file to storage (implementation depends on storage service)
    // const url = await uploadToStorage(data.localPath);
    
    const created = await prisma.mediaAttachment.create({
      data: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        metadata: data.metadata,
        assessmentId: data.assessmentId,
        responseId: data.responseId,
        syncStatus: SyncStatus.SYNCED,
        // url: url, // Set after upload
      },
    });
    
    return {
      offlineId,
      serverId: created.id,
      status: 'success',
    };
  }
  
  /**
   * Log sync conflict
   */
  private static async logConflict(conflict: {
    entityType: string;
    entityId: string;
    winningVersion: any;
    losingVersion: any;
  }) {
    return prisma.syncConflict.create({
      data: {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        conflictDate: new Date(),
        resolutionMethod: 'LAST_WRITE_WINS',
        winningVersion: conflict.winningVersion,
        losingVersion: conflict.losingVersion,
        resolvedAt: new Date(),
        coordinatorNotified: false,
      },
    });
  }
  
  /**
   * Get data for pull sync
   */
  static async getPullData(
    userId: string,
    lastSyncTimestamp?: string,
    entityIds?: string[]
  ) {
    const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined;
    
    // Get user's assigned entities
    const assignments = await prisma.entityAssignment.findMany({
      where: {
        userId,
        isActive: true,
        ...(entityIds && { entityId: { in: entityIds } }),
      },
      select: { entityId: true },
    });
    
    const assignedEntityIds = assignments.map((a) => a.entityId);
    
    // Get assessments
    const assessments = await prisma.rapidAssessment.findMany({
      where: {
        entityId: { in: assignedEntityIds },
        ...(since && { updatedAt: { gte: since } }),
      },
      include: {
        mediaAttachments: true,
      },
    });
    
    // Get responses
    const responses = await prisma.rapidResponse.findMany({
      where: {
        entityId: { in: assignedEntityIds },
        ...(since && { updatedAt: { gte: since } }),
      },
      include: {
        mediaAttachments: true,
      },
    });
    
    // Get entities
    const entities = await prisma.affectedEntity.findMany({
      where: {
        id: { in: assignedEntityIds },
      },
    });
    
    return {
      assessments,
      responses,
      entities,
      syncTimestamp: new Date().toISOString(),
    };
  }
}
```

---
