/**
 * API Route: GET /api/v1/entities/[id]/incidents
 * 
 * Lists incidents affecting a specific entity through assessments.
 * Provides reverse relationship queries with filtering capabilities
 * and comprehensive statistics for entity-centric views.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getEntityIncidents, calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { z } from 'zod';

// Request validation schema
const QueryParamsSchema = z.object({
  priorityFilter: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  assessmentTypeFilter: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  verificationStatusFilter: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  offset: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Authorization check - only coordinators and admins
    // TODO: Implement proper role check when auth system is available
    // const userRole = await getUserRole(session.user.id);
    // if (!['COORDINATOR', 'ADMIN'].includes(userRole)) {
    //   return NextResponse.json(
    //     { success: false, error: 'Insufficient permissions' },
    //     { status: 403 }
    //   );
    // }

    const entityId = params.id;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryResult = QueryParamsSchema.safeParse({
      priorityFilter: searchParams.get('priorityFilter'),
      assessmentTypeFilter: searchParams.get('assessmentTypeFilter'),
      verificationStatusFilter: searchParams.get('verificationStatusFilter'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        },
        { status: 400 }
      );
    }

    const queryParams: RelationshipQueryParams = {
      entityId,
      ...queryResult.data,
    };

    // Get incidents affecting this entity via assessments
    const [incidents, statistics] = await Promise.all([
      getEntityIncidents(entityId, queryParams),
      calculateRelationshipStatistics(queryParams),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents,
      statistics,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: incidents.length,
      },
    });

  } catch (error) {
    console.error('Error fetching entity incidents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch incidents for entity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}