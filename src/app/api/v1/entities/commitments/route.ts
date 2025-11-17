import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/client';
import { z } from 'zod';
import { auditLog } from '@/lib/services/audit.service';

// Validation schema for creating commitments
const CreateCommitmentSchema = z.object({
  donorId: z.string().uuid(),
  entityId: z.string().uuid(),
  incidentId: z.string().uuid(),
  items: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().min(1),
    estimatedValue: z.number().min(0).optional()
  })).min(1),
  notes: z.string().optional()
});

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
        resource: 'ENTITY_COMMITMENTS',
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;
    
    // Add search functionality
    if (search) {
      whereClause.OR = [
        { donor: { name: { contains: search, mode: 'insensitive' } } },
        { entity: { name: { contains: search, mode: 'insensitive' } } },
        { incident: { type: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count for pagination
    const total = await db.donorCommitment.count({ where: whereClause });

    // Fetch commitments with related data
    const commitments = await db.donorCommitment.findMany({
      where: whereClause,
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true,
            contactPhone: true,
            organization: true
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
            severity: true,
            location: true
          }
        }
      },
      orderBy: {
        commitmentDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    // Log successful access
    await auditLog({
      userId: session.user.id,
      action: 'ACCESS_ENTITY_COMMITMENTS',
      resource: 'ENTITY_COMMITMENTS',
      oldValues: null,
      newValues: { 
        filters: { status, donorId, entityId, search },
        pagination: { page, limit, total }
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        data: commitments,
        pagination
      }
    });

  } catch (error) {
    console.error('Error fetching entity commitments:', error);
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
          action: 'ERROR_ACCESS_ENTITY_COMMITMENTS',
          resource: 'ENTITY_COMMITMENTS',
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

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, error: 'Forbidden - Coordinator access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCommitmentSchema.parse(body);

    // Verify donor, entity, and incident exist
    const [donor, entity, incident] = await Promise.all([
      db.donor.findUnique({ where: { id: validatedData.donorId } }),
      db.entity.findUnique({ where: { id: validatedData.entityId } }),
      db.incident.findUnique({ where: { id: validatedData.incidentId } })
    ]);

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      );
    }

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

    // Calculate total quantities and estimated value
    const totalCommittedQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValueEstimated = validatedData.items.reduce((sum, item) => 
      sum + (item.estimatedValue || 0) * item.quantity, 0
    );

    // Create the commitment
    const commitment = await db.donorCommitment.create({
      data: {
        donorId: validatedData.donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        status: 'PLANNED',
        items: validatedData.items,
        totalCommittedQuantity,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        totalValueEstimated,
        notes: validatedData.notes,
        commitmentDate: new Date()
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true,
            contactPhone: true,
            organization: true
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
            severity: true,
            location: true
          }
        }
      }
    });

    // Log successful creation
    await auditLog({
      userId: session.user.id,
      action: 'CREATE_COMMITMENT',
      resource: 'ENTITY_COMMITMENTS',
      resourceId: commitment.id,
      oldValues: null,
      newValues: {
        donorId: validatedData.donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        items: validatedData.items,
        totalCommittedQuantity,
        totalValueEstimated
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: commitment,
      message: 'Commitment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating commitment:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
          action: 'ERROR_CREATE_COMMITMENT',
          resource: 'ENTITY_COMMITMENTS',
          oldValues: null,
          newValues: { 
            error: error instanceof Error ? error.message : 'Unknown error',
            body: await request.clone().json().catch(() => ({}))
          },
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