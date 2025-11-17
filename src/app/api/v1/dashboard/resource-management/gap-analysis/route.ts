import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorization check - COORDINATOR role required
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'COORDINATOR') {
      await auditLog({
        userId: session.user.id,
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    // Build where clause for entities with verified assessments
    const entityWhereClause: any = {
      assessments: {
        some: {
          status: 'VERIFIED'
        }
      }
    };

    if (entityId && entityId !== 'all') {
      entityWhereClause.id = entityId;
    }

    if (incidentId && incidentId !== 'all') {
      entityWhereClause.assessments = {
        some: {
          status: 'VERIFIED',
          incidentId: incidentId
        }
      };
    }

    // Fetch entities with their latest verified assessments
    const entities = await db.entity.findMany({
      where: entityWhereClause,
      include: {
        assessments: {
          where: {
            status: 'VERIFIED',
            ...(incidentId && incidentId !== 'all' && { incidentId })
          },
          select: {
            id: true,
            incidentId: true,
            resources: {
              select: {
                resourceType: true,
                requiredQuantity: true,
                committedQuantity: true,
                deliveredQuantity: true,
                gap: true,
                severity: true,
                priority: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get only the latest assessment per entity
        },
        commitments: {
          select: {
            id: true,
            items: true,
            status: true,
            totalValueEstimated: true
          }
        }
      }
    });

    // Process gap analysis for each entity
    const gapAnalysisData: any[] = [];
    let totalGaps = 0;
    let criticalGaps = 0;
    let totalGapValue = 0;
    const bySeverity: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const entity of entities) {
      if (entity.assessments.length === 0) continue;

      const latestAssessment = entity.assessments[0];
      const gaps: any[] = [];
      let entityTotalGapValue = 0;
      let entityCriticalGaps = 0;

      // Process each resource gap
      for (const resource of latestAssessment.resources) {
        if (resource.gap <= 0) continue;

        // Apply severity filter if specified
        if (severity && severity !== 'all' && resource.severity !== severity) {
          continue;
        }

        totalGaps++;
        bySeverity[resource.severity] = (bySeverity[resource.severity] || 0) + 1;

        if (resource.severity === 'HIGH') {
          criticalGaps++;
          entityCriticalGaps++;
        }

        // Calculate gap value (estimated based on standard pricing)
        const estimatedValuePerUnit = getEstimatedValuePerUnit(resource.resourceType);
        const gapValue = resource.gap * estimatedValuePerUnit;
        entityTotalGapValue += gapValue;
        totalGapValue += gapValue;

        const percentageMet = resource.requiredQuantity > 0 
          ? ((resource.committedQuantity + resource.deliveredQuantity) / resource.requiredQuantity) * 100 
          : 0;

        gaps.push({
          resourceName: resource.resourceType,
          requiredQuantity: resource.requiredQuantity,
          committedQuantity: resource.committedQuantity,
          deliveredQuantity: resource.deliveredQuantity,
          gap: resource.gap,
          percentageMet: Math.round(percentageMet * 100) / 100,
          severity: resource.severity,
          priority: resource.priority || 1
        });
      }

      // Only include entities that have gaps after filtering
      if (gaps.length > 0) {
        gapAnalysisData.push({
          entityId: entity.id,
          entity: {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            location: entity.location
          },
          gaps,
          totalGapValue: entityTotalGapValue,
          criticalGaps: entityCriticalGaps
        });
      }
    }

    // Sort entities by critical gaps count and total gap value
    gapAnalysisData.sort((a, b) => {
      if (a.criticalGaps !== b.criticalGaps) {
        return b.criticalGaps - a.criticalGaps;
      }
      return b.totalGapValue - a.totalGapValue;
    });

    const summary = {
      totalEntities: gapAnalysisData.length,
      totalGaps,
      criticalGaps,
      totalGapValue,
      bySeverity
    };

    // Log successful access
    await auditLog({
      userId: session.user.id,
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
        data: gapAnalysisData,
        summary
      }
    });

  } catch (error) {
    console.error('Error generating gap analysis:', error);
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
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