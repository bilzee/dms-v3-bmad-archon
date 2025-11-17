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
        resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;
    if (incidentId && incidentId !== 'all') whereClause.incidentId = incidentId;
    
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
            severity: true,
            location: true
          }
        }
      },
      orderBy: {
        lastUpdated: 'desc'
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
      action: 'ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS',
      resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
      oldValues: null,
      newValues: { 
        filters: { status, donorId, entityId, incidentId, search },
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
    console.error('Error fetching resource management commitments:', error);
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
          action: 'ERROR_ACCESS_COMMITMENTS',
          resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
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