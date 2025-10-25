import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/auth/middleware';
import { PreliminaryAssessmentService } from '@/lib/services/preliminary-assessment.service';
import { 
  CreatePreliminaryAssessmentSchema,
  QueryPreliminaryAssessmentSchema 
} from '@/lib/validation/preliminary-assessment';
import { PreliminaryAssessmentListResponse } from '@/types/preliminary-assessment';

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const query = QueryPreliminaryAssessmentSchema.parse(searchParams);
    
    const { assessments, total, totalPages } = await PreliminaryAssessmentService.findAll(query);

    const response: PreliminaryAssessmentListResponse = {
      data: assessments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get preliminary assessments error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});