import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: donorId } = params;
  
  try {
    // Validate donor exists
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, isActive: true }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const incidentId = url.searchParams.get('incidentId');
    const status = url.searchParams.get('status') as any;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      donorId,
      donor: {
        isActive: true
      }
    };

    if (entityId) whereClause.entityId = entityId;
    if (incidentId) whereClause.incidentId = incidentId;
    if (status) whereClause.status = status;

    // Check authorization for responders
    if (roles.includes('RESPONDER')) {
      // Responders can only see commitments for their assigned entities
      const entityAssignmentService = new EntityAssignmentServiceImpl();
      
      if (entityId) {
        const isAssigned = await entityAssignmentService.isUserAssigned(user.id, entityId);
        if (!isAssigned) {
          return NextResponse.json(
            { success: false, error: 'Access denied. Entity not assigned to responder.' },
            { status: 403 }
          );
        }
      } else {
        // If no specific entity, get all assigned entities for the responder
        const assignedEntities = await entityAssignmentService.getUserAssignedEntities(user.id);
        const assignedEntityIds = assignedEntities.map(e => e.id);
        whereClause.entityId = { in: assignedEntityIds };
      }
    } else if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get commitments with related data
    const [commitments, total] = await Promise.all([
      prisma.donorCommitment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              type: true,
              organization: true,
              contactEmail: true,
              contactPhone: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          incident: {
            select: {
              id: true,
              type: true,
              subType: true,
              severity: true,
              status: true,
              description: true,
              location: true
            }
          }
        },
        orderBy: {
          commitmentDate: 'desc'
        }
      }),
      prisma.donorCommitment.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: commitments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching donor commitments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});