import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { CreateCommitmentSchema, CommitmentQuerySchema } from '@/lib/validation/commitment';
import { AuditLogServiceImpl } from '@/lib/services/audit-log.service';

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
    const includeResponses = url.searchParams.get('includeResponses') === 'true';
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
    } else if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN') && !roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // For donors, ensure they can only access their own commitments
    if (roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      // Need to verify the donor ID matches a donor record linked to this user's organization
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organization: true }
      });
      
      const userDonor = await prisma.donor.findFirst({
        where: {
          OR: [
            ...(currentUser?.organization ? [{ name: currentUser.organization }] : []),
            ...(currentUser?.organization ? [{ organization: currentUser.organization }] : [])
          ],
          isActive: true
        }
      });
      
      if (!userDonor || userDonor.id !== donorId) {
        return NextResponse.json(
          { success: false, error: 'Access denied. Can only view own commitments.' },
          { status: 403 }
        );
      }
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
          },
          ...(includeResponses && {
            responses: {
              select: {
                id: true,
                type: true,
                priority: true,
                status: true,
                description: true,
                items: true,
                plannedDate: true,
                responseDate: true,
                verificationStatus: true,
                verifiedAt: true,
                createdAt: true,
                updatedAt: true,
                entity: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    location: true
                  }
                }
              }
            }
          })
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

export const POST = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: donorId } = params;
  
  try {
    // Validate donor exists and is active
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, isActive: true }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found or inactive' },
        { status: 404 }
      );
    }

    // Check authorization - only the donor themselves, coordinators, or admins can create commitments
    if (roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      // For donor-only users, verify they can only create commitments for their own organization
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organization: true }
      });
      
      if (!currentUser?.organization || 
          (donor.name !== currentUser.organization && donor.organization !== currentUser.organization)) {
        return NextResponse.json(
          { success: false, error: 'Access denied. Can only create commitments for your own organization.' },
          { status: 403 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCommitmentSchema.parse(body);

    // Validate that entity exists and is part of the incident
    const [entity, incident] = await Promise.all([
      prisma.entity.findUnique({
        where: { id: validatedData.entityId },
        select: { id: true, name: true, type: true, location: true, incidentId: true }
      }),
      prisma.incident.findUnique({
        where: { id: validatedData.incidentId },
        select: { id: true, type: true, status: true }
      })
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    // If entity has an incidentId, ensure it matches the selected incident
    if (entity.incidentId && entity.incidentId !== validatedData.incidentId) {
      return NextResponse.json(
        { success: false, error: 'Entity is not part of the selected incident' },
        { status: 400 }
      );
    }

    // Calculate total committed quantity
    const totalCommittedQuantity = validatedData.items.reduce(
      (sum, item) => sum + item.quantity, 
      0
    );

    // Create commitment
    const commitment = await prisma.donorCommitment.create({
      data: {
        donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        status: 'PLANNED',
        items: validatedData.items,
        totalCommittedQuantity,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: validatedData.notes
      },
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
      }
    });

    // Log audit trail
    const auditLogService = new AuditLogServiceImpl();
    await auditLogService.logAction({
      userId: user.id,
      action: 'CREATE_COMMITMENT',
      entityType: 'DonorCommitment',
      entityId: commitment.id,
      oldValues: null,
      newValues: {
        donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        items: validatedData.items,
        totalCommittedQuantity,
        notes: validatedData.notes
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: commitment,
      message: 'Commitment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating commitment:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});