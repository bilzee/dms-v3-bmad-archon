import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';

export const GET = withAuth(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'SUBMITTED';
    const entityId = searchParams.get('entityId');
    const assessmentType = searchParams.get('assessmentType');

    // Build where clause for verification queue
    const whereClause: any = {
      verificationStatus: status,
    };

    if (entityId) {
      whereClause.entityId = entityId;
    }

    if (assessmentType) {
      whereClause.rapidAssessmentType = assessmentType;
    }

    // Get total count for pagination
    const total = await prisma.rapidAssessment.count({
      where: whereClause
    });

    // Get paginated verification queue
    const assessments = await prisma.rapidAssessment.findMany({
      where: whereClause,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            autoApproveEnabled: true
          }
        },
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { rapidAssessmentDate: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Verification queue API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});