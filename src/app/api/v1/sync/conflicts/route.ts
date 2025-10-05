import { NextRequest, NextResponse } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const entityType = searchParams.get('entityType') as 'assessment' | 'response' | 'entity' | null;
    const resolved = searchParams.get('resolved');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Authorization check (coordinator role required)
    // TODO: Implement proper role checking when auth system is available
    // For now, we'll skip auth validation as per story dependencies
    
    // Get all conflicts
    let conflicts = await conflictResolver.getConflictHistory();
    
    // Apply filters
    if (entityType) {
      conflicts = conflicts.filter(conflict => conflict.entityType === entityType);
    }
    
    if (resolved !== null) {
      const isResolved = resolved === 'true';
      conflicts = conflicts.filter(conflict => conflict.isResolved === isResolved);
    }
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      conflicts = conflicts.filter(conflict => 
        new Date(conflict.createdAt) >= fromDate
      );
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      conflicts = conflicts.filter(conflict => 
        new Date(conflict.createdAt) <= toDate
      );
    }
    
    // Calculate pagination
    const total = conflicts.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedConflicts = conflicts.slice(offset, offset + limit);
    
    // Transform data for API response
    const transformedConflicts = paginatedConflicts.map(conflict => ({
      id: conflict.conflictId,
      entityType: conflict.entityType,
      entityId: conflict.entityUuid,
      conflictDate: conflict.createdAt,
      resolutionMethod: conflict.resolutionStrategy.toUpperCase(),
      winningVersion: conflict.isResolved ? conflict.resolvedData : conflict.serverData,
      losingVersion: conflict.isResolved ? 
        (conflict.resolutionStrategy === 'last_write_wins' ? 
          (conflict.resolvedData === conflict.serverData ? conflict.localData : conflict.serverData) : 
          null) : 
        conflict.localData,
      resolvedAt: conflict.resolvedAt,
      isResolved: conflict.isResolved,
      resolvedBy: conflict.resolvedBy,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
      metadata: conflict.metadata
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedConflicts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error retrieving conflicts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve conflicts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}