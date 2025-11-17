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
        resource: 'RESOURCE_MANAGEMENT_STATS',
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
    const status = searchParams.get('status');
    const donorId = searchParams.get('donorId');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    // Build where clause
    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;
    if (incidentId && incidentId !== 'all') whereClause.incidentId = incidentId;

    // Get commitment statistics
    const [
      totalCommitments,
      statusCounts,
      totalValue,
      totalQuantities,
      criticalGapsCount
    ] = await Promise.all([
      // Total commitments count
      db.donorCommitment.count({ where: whereClause }),
      
      // Status breakdown
      db.donorCommitment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      }),
      
      // Total estimated value
      db.donorCommitment.aggregate({
        where: whereClause,
        _sum: { totalValueEstimated: true }
      }),
      
      // Total quantities
      db.donorCommitment.aggregate({
        where: whereClause,
        _sum: {
          totalCommittedQuantity: true,
          deliveredQuantity: true
        }
      }),
      
      // Critical gaps count (entities with high severity gaps)
      db.entity.count({
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
        }
      })
    ]);

    // Calculate status breakdown object
    const byStatus = statusCounts.reduce((acc, status) => {
      acc[status.status] = status._count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average delivery rate
    const totalCommitted = totalQuantities._sum.totalCommittedQuantity || 0;
    const totalDelivered = totalQuantities._sum.deliveredQuantity || 0;
    const averageDeliveryRate = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

    const stats = {
      totalCommitments,
      totalValue: totalValue._sum.totalValueEstimated || 0,
      totalCommittedQuantity: totalCommitted,
      totalDeliveredQuantity: totalDelivered,
      averageDeliveryRate: Math.round(averageDeliveryRate * 100) / 100, // Round to 2 decimal places
      byStatus,
      criticalGaps: criticalGapsCount
    };

    // Log successful access
    await auditLog({
      userId: session.user.id,
      action: 'ACCESS_RESOURCE_MANAGEMENT_STATS',
      resource: 'RESOURCE_MANAGEMENT_STATS',
      oldValues: null,
      newValues: { filters: { status, donorId, entityId, incidentId } },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching resource management stats:', error);
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
          action: 'ERROR_ACCESS_RESOURCE_STATS',
          resource: 'RESOURCE_MANAGEMENT_STATS',
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