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

    // Find critical resource gaps based on verified assessments
    const criticalGaps = await db.entity.findMany({
      where: {
        assessments: {
          some: {
            status: 'VERIFIED',
            resources: {
              some: {
                gap: { gt: 0 },
                severity: 'HIGH'
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        assessments: {
          where: {
            status: 'VERIFIED',
            resources: {
              some: {
                gap: { gt: 0 },
                severity: { in: ['HIGH', 'MEDIUM'] }
              }
            }
          },
          select: {
            resources: {
              where: {
                gap: { gt: 0 },
                severity: { in: ['HIGH', 'MEDIUM'] }
              },
              select: {
                resourceType: true,
                requiredQuantity: true,
                committedQuantity: true,
                deliveredQuantity: true,
                gap: true,
                severity: true
              },
              orderBy: {
                gap: 'desc'
              }
            }
          }
        }
      }
    });

    // Transform data to the expected format
    const transformedGaps = criticalGaps.flatMap(entity => 
      entity.assessments.flatMap(assessment =>
        assessment.resources.map(resource => ({
          entity: {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            location: entity.location
          },
          resource: resource.resourceType,
          unmetNeed: resource.gap,
          severity: resource.severity as 'HIGH' | 'MEDIUM' | 'LOW',
          requiredQuantity: resource.requiredQuantity,
          committedQuantity: resource.committedQuantity,
          deliveredQuantity: resource.deliveredQuantity,
          gap: resource.gap
        }))
      )
    );

    // Sort by severity (HIGH first) and gap size (largest first)
    const sortedGaps = transformedGaps.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.unmetNeed - a.unmetNeed;
    });

    // Log successful access
    await auditLog({
      userId: session.user.id,
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
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
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