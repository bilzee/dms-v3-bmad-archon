import { NextRequest, NextResponse } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';

// Prevent static generation during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authorization check (coordinator role required)
    // TODO: Implement proper role checking when auth system is available
    
    // Get conflict statistics
    const stats = await conflictResolver.getConflictStats();
    
    // Transform stats for API response
    const summary = {
      totalConflicts: stats.total,
      unresolvedConflicts: stats.unresolved,
      autoResolvedConflicts: stats.autoResolved,
      manuallyResolvedConflicts: stats.manuallyResolved,
      resolutionRate: stats.total > 0 ? 
        Math.round(((stats.autoResolved + stats.manuallyResolved) / stats.total) * 100) : 0,
      conflictsByType: {
        assessment: stats.byType.assessment,
        response: stats.byType.response,
        entity: stats.byType.entity
      },
      recentConflicts: stats.recentConflicts.slice(0, 5).map(conflict => ({
        id: conflict.conflictId,
        entityType: conflict.entityType,
        entityId: conflict.entityUuid,
        conflictDate: conflict.createdAt,
        isResolved: conflict.isResolved,
        resolutionMethod: conflict.resolutionStrategy.toUpperCase(),
        autoResolved: conflict.metadata?.autoResolved || false
      })),
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error retrieving conflict summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve conflict summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}