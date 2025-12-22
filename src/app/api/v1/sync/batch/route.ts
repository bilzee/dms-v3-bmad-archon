import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { entityAssignmentService } from '@/lib/services/entity-assignment.service';

// Define the sync change schema
const SyncChangeSchema = z.object({
  type: z.enum(['assessment', 'response', 'entity']),
  action: z.enum(['create', 'update', 'delete']),
  data: z.any(),
  offlineId: z.string().optional(),
  versionNumber: z.number(),
  entityUuid: z.string()
});

const BatchSyncRequestSchema = z.object({
  changes: z.array(SyncChangeSchema)
});

// Define response schemas
const SyncResultSchema = z.object({
  offlineId: z.string().optional(),
  serverId: z.string(),
  status: z.enum(['success', 'conflict', 'failed']),
  message: z.string().optional(),
  conflictData: z.any().optional()
});

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    console.log('Batch sync endpoint called');
    
    // Get user's assigned entities from database
    const assignedEntities = await entityAssignmentService.getAssignedEntities(context.userId);
    const entityIds = assignedEntities.map(entity => entity.id);
    
    const userContext = {
      userId: context.userId,
      entityIds
    };
    
    console.log(`User ${userContext.userId} authorized with ${userContext.entityIds.length} entities`);
    
    // Check rate limiting
    const clientId = request.headers.get('x-client-id') || userContext.userId;
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = BatchSyncRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { changes } = validationResult.data;
    
    if (changes.length === 0) {
      return NextResponse.json([]);
    }

    if (changes.length > 100) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 100 items allowed.' },
        { status: 400 }
      );
    }

    // Validate user has permission for all entities in the batch
    const entityValidation = await validateEntityPermissions(userContext, changes);
    if (!entityValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Entity permission denied', 
          unauthorizedEntities: entityValidation.unauthorizedEntities 
        },
        { status: 403 }
      );
    }

    // Process each change
    const results = await processBatchChanges(changes);
    
    console.log(`Processed ${changes.length} changes: ${results.filter(r => r.status === 'success').length} successful, ${results.filter(r => r.status === 'conflict').length} conflicts, ${results.filter(r => r.status === 'failed').length} failed`);
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Batch sync endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
})

async function processBatchChanges(changes: z.infer<typeof SyncChangeSchema>[]) {
  const results = [];
  
  // Use a proper database transaction for data integrity
  console.log('Starting batch transaction...');
  
  try {
    // In a production environment, this would be a real database transaction
    // For this implementation, we'll use a simulation with rollback capability
    const transactionResults = [];
    const processedChanges = [];
    
    for (const change of changes) {
      try {
        const result = await processSingleChange(change);
        transactionResults.push(result);
        processedChanges.push(change);
        
        // If any single change fails, we need to rollback
        if (result.status === 'failed') {
          throw new Error(`Change processing failed: ${result.message}`);
        }
        
        results.push(result);
      } catch (singleChangeError) {
        console.error(`Single change failed, rolling back transaction:`, singleChangeError);
        
        // Simulate rollback by marking all processed changes as failed
        await rollbackProcessedChanges(processedChanges);
        
        // Mark all remaining changes as failed due to transaction rollback
        const failedResult = {
          offlineId: '',
          serverId: '',
          status: 'failed' as const,
          message: 'Transaction rolled back due to processing failure'
        };
        
        // Clear successful results and mark all as failed
        results.length = 0;
        for (const failedChange of changes) {
          results.push({
            ...failedResult,
            offlineId: failedChange.offlineId || failedChange.entityUuid
          });
        }
        
        throw singleChangeError;
      }
    }
    
    // Commit transaction (in a real implementation, this would commit to database)
    console.log('Batch transaction committed successfully');
    return results;
    
  } catch (error) {
    console.error('Batch transaction failed and rolled back:', error);
    
    // Ensure all results are marked as failed if we reach this point
    if (results.length === 0 || results.some(r => r.status === 'success' || r.status === 'conflict')) {
      results.length = 0;
      const failedResult = {
        offlineId: '',
        serverId: '',
        status: 'failed' as const,
        message: 'Batch transaction failed and was rolled back'
      };
      
      for (const change of changes) {
        results.push({
          ...failedResult,
          offlineId: change.offlineId || change.entityUuid
        });
      }
    }
    
    return results;
  }
}

// Simulate rollback functionality
async function rollbackProcessedChanges(processedChanges: z.infer<typeof SyncChangeSchema>[]) {
  console.log(`Rolling back ${processedChanges.length} processed changes...`);
  
  // In a real implementation, this would:
  // 1. Reverse any database changes made during the transaction
  // 2. Restore previous state
  // 3. Update audit logs
  
  for (const change of processedChanges) {
    console.log(`Rolling back ${change.type} ${change.action} for ${change.entityUuid}`);
    
    // Simulate rollback operations
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log('Rollback completed');
}

async function processSingleChange(change: z.infer<typeof SyncChangeSchema>) {
  try {
    console.log(`Processing ${change.type} ${change.action} for ${change.entityUuid}`);
    
    // Mock processing - in a real implementation, this would:
    // 1. Validate user permissions for the entity
    // 2. Check for conflicts using version numbers
    // 3. Apply the change to the database
    // 4. Return appropriate result
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Mock conflict detection (10% chance for demo purposes)
    if (Math.random() < 0.1) {
      return {
        offlineId: change.offlineId || '',
        serverId: generateServerId(),
        status: 'conflict' as const,
        message: `Version conflict detected for ${change.type} ${change.entityUuid}`,
        conflictData: {
          ...change.data,
          serverVersion: change.versionNumber + 1,
          lastModified: new Date().toISOString(),
          conflictReason: 'Version mismatch'
        }
      };
    }
    
    // Mock failure (5% chance for demo purposes)
    if (Math.random() < 0.05) {
      return {
        offlineId: change.offlineId || '',
        serverId: '',
        status: 'failed' as const,
        message: `Failed to process ${change.type} ${change.action}: Validation error`
      };
    }
    
    // Success case
    const serverId = generateServerId();
    
    return {
      offlineId: change.offlineId || '',
      serverId,
      status: 'success' as const,
      message: `${change.type} ${change.action} completed successfully`
    };
    
  } catch (error) {
    console.error(`Error processing change for ${change.entityUuid}:`, error);
    
    return {
      offlineId: change.offlineId || '',
      serverId: '',
      status: 'failed' as const,
      message: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function generateServerId(): string {
  // Generate a mock server ID
  return `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


// Validate user has permission for specific entities
async function validateEntityPermissions(
  userContext: { userId: string; entityIds: string[] },
  changes: z.infer<typeof SyncChangeSchema>[]
): Promise<{ isValid: boolean; unauthorizedEntities: string[] }> {
  try {
    const unauthorizedEntities: string[] = [];
    
    for (const change of changes) {
      if (!userContext.entityIds.includes(change.entityUuid)) {
        unauthorizedEntities.push(change.entityUuid);
      }
    }
    
    const isValid = unauthorizedEntities.length === 0;
    
    if (!isValid) {
      console.warn(`User ${userContext.userId} attempted to access unauthorized entities:`, unauthorizedEntities);
    }
    
    return {
      isValid,
      unauthorizedEntities
    };
    
  } catch (error) {
    console.error('Entity permission validation failed:', error);
    return {
      isValid: false,
      unauthorizedEntities: []
    };
  }
}

// Rate limiting helper (mock implementation)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimitCache.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitCache.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}