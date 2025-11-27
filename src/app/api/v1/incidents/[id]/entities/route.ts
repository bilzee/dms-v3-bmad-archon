/**
 * API Route: GET /api/v1/incidents/[id]/entities
 * 
 * Lists entities with assessments for a specific incident.
 * Provides assessment-based entity listing with priority filtering,
 * sorting capabilities, and comprehensive statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getIncidentEntities, calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { z } from 'zod';

interface RouteParams {
  params: { id: string }
}

// Request validation schema - handles null from searchParams.get()
const QueryParamsSchema = z.object({
  priorityFilter: z.string().nullable(),
  assessmentTypeFilter: z.string().nullable(),
  verificationStatusFilter: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  limit: z.string().nullable(),
  offset: z.string().nullable(),
});

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  try {
    // Authorization check - only coordinators and admins can access entities
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Admin role required.' },
        { status: 403 }
      );
    }

    const incidentId = params.id;
    const { searchParams } = new URL(request.url);

    // Get query parameters  
    const rawParams = {
      priorityFilter: searchParams.get('priorityFilter'),
      assessmentTypeFilter: searchParams.get('assessmentTypeFilter'),
      verificationStatusFilter: searchParams.get('verificationStatusFilter'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    console.log('Incident entities raw query params:', rawParams);

    // Validate query parameters
    const queryResult = QueryParamsSchema.safeParse(rawParams);

    if (!queryResult.success) {
      console.error('Incident entities query validation failed:', queryResult.error.issues);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        },
        { status: 400 }
      );
    }

    const validatedData = queryResult.data;

    // Transform validated data to RelationshipQueryParams
    const queryParams: RelationshipQueryParams = {
      incidentId,
      ...(validatedData.priorityFilter && validatedData.priorityFilter !== null && { 
        priorityFilter: validatedData.priorityFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.assessmentTypeFilter && validatedData.assessmentTypeFilter !== null && { 
        assessmentTypeFilter: validatedData.assessmentTypeFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.verificationStatusFilter && validatedData.verificationStatusFilter !== null && { 
        verificationStatusFilter: validatedData.verificationStatusFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.startDate && validatedData.startDate !== null && { startDate: new Date(validatedData.startDate) }),
      ...(validatedData.endDate && validatedData.endDate !== null && { endDate: new Date(validatedData.endDate) }),
      ...(validatedData.limit && validatedData.limit !== null && { limit: parseInt(validatedData.limit) }),
      ...(validatedData.offset && validatedData.offset !== null && { offset: parseInt(validatedData.offset) }),
    };

    // Set defaults for pagination
    queryParams.limit = queryParams.limit || 100;
    queryParams.offset = queryParams.offset || 0;

    console.log('Incident entities transformed query params:', queryParams);

    // Get entities with assessments for this incident
    const [entities, statistics] = await Promise.all([
      getIncidentEntities(incidentId, queryParams),
      calculateRelationshipStatistics(queryParams),
    ]);

    return NextResponse.json({
      success: true,
      data: entities,
      statistics,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: entities.length,
      },
    });

  } catch (error) {
    console.error('Error fetching incident entities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch entities for incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});