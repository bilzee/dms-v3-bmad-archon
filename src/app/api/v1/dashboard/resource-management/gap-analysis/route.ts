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
          resource: 'GAP_ANALYSIS',
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    // NOTE: The current schema doesn't support generic resource gaps with assessments
    // This is a mock implementation until proper gap analysis is implemented
    // TODO: Implement real gap analysis based on assessment types (food, health, wash, etc.)
    
    const mockGapAnalysisData = [
      {
        entityId: '1',
        entity: {
          id: '1',
          name: 'Affected Community A',
          type: 'COMMUNITY',
          location: 'Lagos State'
        },
        gaps: [
          {
            resourceName: 'WATER',
            requiredQuantity: 10000,
            committedQuantity: 3000,
            deliveredQuantity: 2000,
            gap: 5000,
            percentageMet: 50,
            severity: 'HIGH',
            priority: 1
          },
          {
            resourceName: 'FOOD',
            requiredQuantity: 8000,
            committedQuantity: 4000,
            deliveredQuantity: 2000,
            gap: 2000,
            percentageMet: 75,
            severity: 'MEDIUM',
            priority: 2
          }
        ],
        totalGapValue: 135000, // $5000 * 20 + $2000 * 15
        criticalGaps: 1
      },
      {
        entityId: '2',
        entity: {
          id: '2',
          name: 'Affected Community B',
          type: 'COMMUNITY',
          location: 'Kano State'
        },
        gaps: [
          {
            resourceName: 'MEDICAL',
            requiredQuantity: 500,
            committedQuantity: 200,
            deliveredQuantity: 100,
            gap: 200,
            percentageMet: 60,
            severity: 'HIGH',
            priority: 1
          }
        ],
        totalGapValue: 5000,
        criticalGaps: 1
      }
    ];

    // Apply filters to mock data
    let filteredData = mockGapAnalysisData;
    
    if (entityId && entityId !== 'all') {
      filteredData = filteredData.filter(entity => entity.entityId === entityId);
    }
    
    if (severity && severity !== 'all') {
      filteredData = filteredData.map(entity => ({
        ...entity,
        gaps: entity.gaps.filter(gap => gap.severity === severity),
        criticalGaps: entity.gaps.filter(gap => gap.severity === 'HIGH').length
      })).filter(entity => entity.gaps.length > 0);
    }

    const summary = {
      totalEntities: filteredData.length,
      totalGaps: filteredData.reduce((acc, entity) => acc + entity.gaps.length, 0),
      criticalGaps: filteredData.reduce((acc, entity) => acc + entity.criticalGaps, 0),
      totalGapValue: filteredData.reduce((acc, entity) => acc + entity.totalGapValue, 0),
      bySeverity: {
        HIGH: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'HIGH').length, 0),
        MEDIUM: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'MEDIUM').length, 0),
        LOW: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'LOW').length, 0)
      }
    };

    // Log successful access
    await auditLog({
      userId: user.id,
      action: 'ACCESS_GAP_ANALYSIS',
      resource: 'GAP_ANALYSIS',
      oldValues: null,
      newValues: { 
        filters: { severity, entityId, incidentId },
        summary
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        data: filteredData,
        summary
      }
    });

  } catch (error) {
    console.error('Error generating gap analysis:', error);
    
    // Log error
    try {
      const authResult = await verifyTokenWithRole(request, 'COORDINATOR');
      if (authResult.success && authResult.user) {
        await auditLog({
          userId: authResult.user.id,
          action: 'ERROR_ACCESS_GAP_ANALYSIS',
          resource: 'GAP_ANALYSIS',
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

// Helper function to estimate value per unit for different resource types
function getEstimatedValuePerUnit(resourceType: string): number {
  const valueMap: Record<string, number> = {
    'WATER': 0.50,      // $0.50 per liter
    'FOOD': 3.00,       // $3.00 per meal/kg
    'MEDICAL': 25.00,   // $25.00 per kit/supply
    'SHELTER': 100.00,  // $100.00 per tent/ shelter unit
    'CLOTHING': 15.00,  // $15.00 per clothing set
    'BLANKETS': 20.00,  // $20.00 per blanket
    'HYGIENE': 10.00,   // $10.00 per hygiene kit
    'TOOLS': 35.00,     // $35.00 per tool set
    'FUEL': 1.50,       // $1.50 per liter
    'COMMUNICATION': 200.00, // $200.00 per communication device
    'TRANSPORT': 500.00,    // $500.00 per vehicle
    'GENERATORS': 1000.00,  // $1000.00 per generator
    'MEDICINE': 50.00,      // $50.00 per medicine kit
    'FIRST_AID': 25.00,     // $25.00 per first aid kit
  };

  return valueMap[resourceType.toUpperCase()] || 10.00; // Default $10 per unit
}