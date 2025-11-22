import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { verifyTokenWithRole } from '@/lib/auth/verify';

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization check - COORDINATOR role required
    const authResult = await verifyTokenWithRole(request, 'COORDINATOR');
    
    if (!authResult.success || !authResult.user) {
      if (authResult.error?.includes('role')) {
        await auditLog({
          userId: authResult.user?.id || 'unknown',
          action: 'UNAUTHORIZED_ACCESS',
          resource: 'CRITICAL_GAPS',
          oldValues: null,
          newValues: null,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        });
        
        return NextResponse.json(
          { success: false, error: 'Forbidden - Coordinator access required' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // NOTE: The current schema doesn't have a resources field with gaps
    // This is a mock implementation until proper gap analysis is implemented
    // TODO: Implement proper gap analysis based on assessment types (food, health, etc.)
    
    const mockCriticalGaps = [
      {
        entity: { id: '1', name: 'Affected Community A', type: 'COMMUNITY', location: 'Lagos State' },
        resource: 'WATER',
        unmetNeed: 5000,
        severity: 'HIGH' as const,
        requiredQuantity: 10000,
        committedQuantity: 3000,
        deliveredQuantity: 2000,
        gap: 5000
      },
      {
        entity: { id: '2', name: 'Affected Community B', type: 'COMMUNITY', location: 'Kano State' },
        resource: 'FOOD',
        unmetNeed: 3000,
        severity: 'HIGH' as const,
        requiredQuantity: 8000,
        committedQuantity: 4000,
        deliveredQuantity: 1000,
        gap: 3000
      }
    ];

    const sortedGaps = mockCriticalGaps;

    // Log successful access
    await auditLog({
      userId: user.id,
      action: 'ACCESS_CRITICAL_GAPS',
      resource: 'CRITICAL_GAPS',
      oldValues: null,
      newValues: { criticalGapsFound: sortedGaps.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        criticalGaps: sortedGaps
      }
    });

  } catch (error) {
    console.error('Error fetching critical gaps:', error);
    
    // Log error
    try {
      const authResult = await verifyTokenWithRole(request, 'COORDINATOR');
      if (authResult.success && authResult.user) {
        await auditLog({
          userId: authResult.user.id,
          action: 'ERROR_ACCESS_CRITICAL_GAPS',
          resource: 'CRITICAL_GAPS',
          oldValues: null,
          newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        });
      }
    } catch (auditError) {
      // Ignore audit log errors
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}