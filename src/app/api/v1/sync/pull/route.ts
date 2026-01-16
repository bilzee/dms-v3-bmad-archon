import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Prevent static generation during build
export const dynamic = 'force-dynamic';

// Define the pull sync request schema
const PullSyncRequestSchema = z.object({
  lastSyncTimestamp: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
  types: z.array(z.enum(['assessment', 'response', 'entity'])).optional(),
  limit: z.number().min(1).max(1000).default(100)
});

// Define response schemas
const SyncItemSchema = z.object({
  id: z.string(),
  type: z.enum(['assessment', 'response', 'entity']),
  entityUuid: z.string(),
  data: z.any(),
  version: z.number(),
  lastModified: z.string(),
  action: z.enum(['create', 'update', 'delete']),
  createdBy: z.string(),
  updatedBy: z.string()
});

const PullSyncResponseSchema = z.object({
  items: z.array(SyncItemSchema),
  hasMore: z.boolean(),
  nextTimestamp: z.string(),
  totalCount: z.number()
});

export async function GET(request: NextRequest) {
  try {
    console.log('Pull sync endpoint called');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      lastSyncTimestamp: searchParams.get('lastSyncTimestamp') || undefined,
      entityIds: searchParams.get('entityIds')?.split(',') || undefined,
      types: searchParams.get('types')?.split(',') as ('assessment' | 'response' | 'entity')[] || undefined,
      limit: parseInt(searchParams.get('limit') || '100')
    };
    
    // Validate query parameters
    const validationResult = PullSyncRequestSchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { lastSyncTimestamp, entityIds, types, limit } = validationResult.data;
    
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
    if (!checkRateLimit(clientId, 50, 60000)) { // 50 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Fetch changes from server
    const syncResponse = await fetchServerChanges({
      userId: userContext.userId,
      userEntityIds: userContext.entityIds,
      lastSyncTimestamp,
      entityIds,
      types,
      limit
    });
    
    console.log(`Returning ${syncResponse.items.length} items to sync (hasMore: ${syncResponse.hasMore})`);
    
    return NextResponse.json(syncResponse);
    
  } catch (error) {
    console.error('Pull sync endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchServerChanges(params: {
  userId: string;
  userEntityIds: string[];
  lastSyncTimestamp?: string;
  entityIds?: string[];
  types?: ('assessment' | 'response' | 'entity')[];
  limit: number;
}) {
  const {
    userId,
    userEntityIds,
    lastSyncTimestamp,
    entityIds,
    types,
    limit
  } = params;
  
  try {
    console.log(`Fetching changes for user ${userId} since ${lastSyncTimestamp}`);
    
    // Mock database query - in a real implementation, this would:
    // 1. Query the database for changes since lastSyncTimestamp
    // 2. Filter by user's assigned entities
    // 3. Apply additional filters (entityIds, types)
    // 4. Order by timestamp and apply limit
    // 5. Return paginated results
    
    const sinceTimestamp = lastSyncTimestamp 
      ? new Date(lastSyncTimestamp) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours by default
    
    // Filter entity IDs to user's authorized entities
    const allowedEntityIds = entityIds 
      ? entityIds.filter(id => userEntityIds.includes(id))
      : userEntityIds;
    
    // Mock data generation
    const mockItems = generateMockSyncItems({
      entityIds: allowedEntityIds,
      types: types || ['assessment', 'response', 'entity'],
      since: sinceTimestamp,
      limit: limit + 1 // Fetch one extra to check for more data
    });
    
    const hasMore = mockItems.length > limit;
    const items = hasMore ? mockItems.slice(0, limit) : mockItems;
    const nextTimestamp = items.length > 0 
      ? items[items.length - 1].lastModified 
      : new Date().toISOString();
    
    return {
      items,
      hasMore,
      nextTimestamp,
      totalCount: items.length
    };
    
  } catch (error) {
    console.error('Error fetching server changes:', error);
    throw error;
  }
}

function generateMockSyncItems(params: {
  entityIds: string[];
  types: ('assessment' | 'response' | 'entity')[];
  since: Date;
  limit: number;
}) {
  const { entityIds, types, since, limit } = params;
  const items = [];
  
  // Generate mock items
  const now = new Date();
  const timeDiff = now.getTime() - since.getTime();
  
  for (let i = 0; i < Math.min(limit, 20); i++) {
    const randomTime = new Date(since.getTime() + Math.random() * timeDiff);
    const type = types[Math.floor(Math.random() * types.length)];
    const entityUuid = entityIds[Math.floor(Math.random() * entityIds.length)];
    
    items.push({
      id: `item_${Date.now()}_${i}`,
      type,
      entityUuid,
      data: generateMockData(type),
      version: Math.floor(Math.random() * 10) + 1,
      lastModified: randomTime.toISOString(),
      action: ['create', 'update'][Math.floor(Math.random() * 2)] as 'create' | 'update',
      createdBy: 'user_123',
      updatedBy: 'user_123'
    });
  }
  
  // Sort by lastModified (oldest first for proper sync order)
  items.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
  
  return items;
}

function generateMockData(type: 'assessment' | 'response' | 'entity') {
  const baseData = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    version: 1
  };
  
  switch (type) {
    case 'assessment':
      return {
        ...baseData,
        assessmentType: 'rapid',
        responses: {
          question1: 'Sample answer',
          question2: 'Another answer'
        },
        gpsLocation: {
          latitude: 9.0579 + (Math.random() - 0.5) * 0.1,
          longitude: 7.4951 + (Math.random() - 0.5) * 0.1,
          accuracy: 10
        },
        mediaFiles: []
      };
      
    case 'response':
      return {
        ...baseData,
        responseType: 'emergency',
        status: 'planned',
        resources: ['resource1', 'resource2'],
        estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };
      
    case 'entity':
      return {
        ...baseData,
        name: `Entity ${Math.floor(Math.random() * 1000)}`,
        type: 'hospital',
        address: 'Sample Address',
        coordinates: {
          latitude: 9.0579 + (Math.random() - 0.5) * 0.1,
          longitude: 7.4951 + (Math.random() - 0.5) * 0.1
        },
        capacity: Math.floor(Math.random() * 100) + 50
      };
      
    default:
      return baseData;
  }
}

// Helper functions (same as in batch endpoint)
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
  // In a real implementation, this would extract client ID from token or IP
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