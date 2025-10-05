import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the conflict resolution request schema
const ConflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolutionStrategy: z.enum(['last_write_wins', 'manual', 'merge']),
  resolvedData: z.any().optional(),
  entityType: z.enum(['assessment', 'response', 'entity']),
  entityUuid: z.string(),
  metadata: z.object({
    reason: z.string().optional(),
    resolvedBy: z.string().optional()
  }).optional()
});

const BulkConflictResolutionSchema = z.object({
  resolutions: z.array(ConflictResolutionSchema)
});

// Define response schemas
const ConflictResolutionResultSchema = z.object({
  conflictId: z.string(),
  success: z.boolean(),
  resolvedData: z.any().optional(),
  message: z.string(),
  serverId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    console.log('Conflict resolution endpoint called');
    
    // Parse and validate request body
    const body = await request.json();
    
    // Check if it's a single resolution or bulk
    const isBulk = Array.isArray(body.resolutions);
    
    const validationResult = isBulk 
      ? BulkConflictResolutionSchema.safeParse(body)
      : ConflictResolutionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // Validate user authorization
    const userContext = await validateUserAuthorization(request);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Check rate limiting
    const clientId = getClientId(request);
    if (!checkRateLimit(clientId, 20, 60000)) { // 20 resolutions per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Process resolutions
    const resolutions = isBulk 
      ? (validationResult.data as z.infer<typeof BulkConflictResolutionSchema>).resolutions
      : [validationResult.data as z.infer<typeof ConflictResolutionSchema>];
    
    const results = await processConflictResolutions(resolutions, userContext);
    
    // Return single result or array based on input
    const response = isBulk ? results : results[0];
    
    console.log(`Processed ${resolutions.length} conflict resolution(s)`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Conflict resolution endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Get conflicts endpoint called');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const entityUuid = searchParams.get('entityUuid');
    const entityType = searchParams.get('entityType') as 'assessment' | 'response' | 'entity' | null;
    const status = searchParams.get('status') as 'unresolved' | 'resolved' | null;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate user authorization
    const userContext = await validateUserAuthorization(request);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Fetch conflicts
    const conflicts = await fetchConflicts({
      userId: userContext.userId,
      userEntityIds: userContext.entityIds,
      entityUuid,
      entityType,
      status,
      limit
    });
    
    console.log(`Returning ${conflicts.length} conflicts`);
    
    return NextResponse.json(conflicts);
    
  } catch (error) {
    console.error('Get conflicts endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processConflictResolutions(
  resolutions: z.infer<typeof ConflictResolutionSchema>[],
  userContext: { userId: string; entityIds: string[] }
) {
  const results = [];
  
  // Process each resolution in a transaction
  for (const resolution of resolutions) {
    try {
      const result = await processSingleConflictResolution(resolution, userContext);
      results.push(result);
    } catch (error) {
      console.error(`Error processing conflict ${resolution.conflictId}:`, error);
      results.push({
        conflictId: resolution.conflictId,
        success: false,
        message: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  return results;
}

async function processSingleConflictResolution(
  resolution: z.infer<typeof ConflictResolutionSchema>,
  userContext: { userId: string; entityIds: string[] }
) {
  const { conflictId, resolutionStrategy, resolvedData, entityType, entityUuid, metadata } = resolution;
  
  console.log(`Processing conflict resolution ${conflictId} using ${resolutionStrategy} strategy`);
  
  // Validate entity access
  if (!userContext.entityIds.includes(entityUuid)) {
    throw new Error(`User does not have access to entity ${entityUuid}`);
  }
  
  // Fetch conflict details (mock implementation)
  const conflict = await fetchConflictDetails(conflictId);
  if (!conflict) {
    throw new Error(`Conflict ${conflictId} not found`);
  }
  
  if (conflict.isResolved) {
    return {
      conflictId,
      success: true,
      resolvedData: conflict.resolvedData,
      message: 'Conflict already resolved',
      serverId: conflict.serverId
    };
  }
  
  // Apply resolution strategy
  let finalResolvedData;
  
  switch (resolutionStrategy) {
    case 'last_write_wins':
      finalResolvedData = applyLastWriteWins(conflict);
      break;
      
    case 'manual':
      if (!resolvedData) {
        throw new Error('Manual resolution requires resolved data');
      }
      finalResolvedData = resolvedData;
      break;
      
    case 'merge':
      finalResolvedData = applyMergeStrategy(conflict);
      break;
      
    default:
      throw new Error(`Unsupported resolution strategy: ${resolutionStrategy}`);
  }
  
  // Apply the resolution to the database
  const serverId = await applyResolutionToDatabase(
    entityType,
    entityUuid,
    finalResolvedData,
    userContext.userId
  );
  
  // Log the resolution
  await logConflictResolution(conflictId, {
    strategy: resolutionStrategy,
    resolvedBy: userContext.userId,
    resolvedData: finalResolvedData,
    metadata: metadata || {}
  });
  
  return {
    conflictId,
    success: true,
    resolvedData: finalResolvedData,
    message: `Conflict resolved using ${resolutionStrategy} strategy`,
    serverId
  };
}

async function fetchConflictDetails(conflictId: string) {
  // Mock conflict data - in a real implementation, this would query the database
  return {
    id: conflictId,
    entityType: 'assessment' as const,
    entityUuid: 'entity_123',
    localData: {
      id: '123',
      value: 'local_value',
      lastModified: '2024-01-01T10:00:00Z',
      version: 1
    },
    serverData: {
      id: '123',
      value: 'server_value',
      lastModified: '2024-01-01T11:00:00Z',
      version: 2
    },
    isResolved: false,
    resolvedData: null,
    serverId: null,
    createdAt: '2024-01-01T12:00:00Z'
  };
}

function applyLastWriteWins(conflict: any) {
  const localTime = new Date(conflict.localData.lastModified).getTime();
  const serverTime = new Date(conflict.serverData.lastModified).getTime();
  
  if (serverTime > localTime) {
    console.log('Last-write-wins: Using server data');
    return conflict.serverData;
  } else {
    console.log('Last-write-wins: Using local data');
    return conflict.localData;
  }
}

function applyMergeStrategy(conflict: any) {
  // Simple merge strategy - combine objects with server data taking precedence
  const merged = {
    ...conflict.localData,
    ...conflict.serverData,
    lastModified: new Date().toISOString(),
    version: Math.max(conflict.localData.version || 1, conflict.serverData.version || 1) + 1,
    _mergedAt: new Date().toISOString(),
    _mergeSource: 'api_resolution'
  };
  
  console.log('Merge strategy: Combined local and server data');
  return merged;
}

async function applyResolutionToDatabase(
  entityType: 'assessment' | 'response' | 'entity',
  entityUuid: string,
  resolvedData: any,
  userId: string
): Promise<string> {
  // Mock database update - in a real implementation, this would:
  // 1. Update the entity with resolved data
  // 2. Increment version number
  // 3. Set lastModified timestamp
  // 4. Record the resolution in audit log
  
  console.log(`Applying resolution to ${entityType} ${entityUuid}`);
  
  // Simulate database operation
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Return mock server ID
  return `srv_${Date.now()}_resolved`;
}

async function logConflictResolution(conflictId: string, resolutionData: any) {
  // Mock logging - in a real implementation, this would store resolution details
  console.log(`Logged conflict resolution for ${conflictId}:`, resolutionData);
}

async function fetchConflicts(params: {
  userId: string;
  userEntityIds: string[];
  entityUuid?: string | null;
  entityType?: 'assessment' | 'response' | 'entity' | null;
  status?: 'unresolved' | 'resolved' | null;
  limit: number;
}) {
  // Mock conflicts data - in a real implementation, this would query the database
  const mockConflicts = [
    {
      id: 'conflict_1',
      entityType: 'assessment',
      entityUuid: 'entity_1',
      isResolved: false,
      createdAt: '2024-01-01T12:00:00Z',
      localVersion: 1,
      serverVersion: 2,
      conflictReason: 'Version mismatch'
    },
    {
      id: 'conflict_2',
      entityType: 'response',
      entityUuid: 'entity_2',
      isResolved: true,
      createdAt: '2024-01-01T11:00:00Z',
      resolvedAt: '2024-01-01T11:30:00Z',
      localVersion: 2,
      serverVersion: 1,
      conflictReason: 'Data conflict'
    }
  ];
  
  // Apply filters
  let filtered = mockConflicts.filter(conflict => 
    params.userEntityIds.includes(conflict.entityUuid)
  );
  
  if (params.entityUuid) {
    filtered = filtered.filter(conflict => conflict.entityUuid === params.entityUuid);
  }
  
  if (params.entityType) {
    filtered = filtered.filter(conflict => conflict.entityType === params.entityType);
  }
  
  if (params.status) {
    const isResolved = params.status === 'resolved';
    filtered = filtered.filter(conflict => conflict.isResolved === isResolved);
  }
  
  return filtered.slice(0, params.limit);
}

// Helper functions
async function validateUserAuthorization(request: NextRequest): Promise<{ userId: string; entityIds: string[] } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    // Mock user context
    return {
      userId: 'user_123',
      entityIds: ['entity_1', 'entity_2', 'entity_3']
    };
    
  } catch (error) {
    console.error('Authorization validation failed:', error);
    return null;
  }
}

function getClientId(request: NextRequest): string {
  return request.headers.get('x-client-id') || 
         request.headers.get('x-forwarded-for') || 
         'unknown';
}

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